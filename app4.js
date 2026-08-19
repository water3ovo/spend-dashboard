function showToast(msg,isError=false){
 const el=document.getElementById('toast');el.textContent=msg;el.className='toast show'+(isError?' error-toast':'');
 clearTimeout(showToast._t);showToast._t=setTimeout(()=>{el.className='toast'},6500)
}
function decodeXml(s){
 return String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
}
function parseSharedStrings(xml){
 if(!xml)return [];
 return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(m=>[...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(x=>decodeXml(x[1])).join(''))
}
function cellValue(cell,shared){
 const t=(cell.match(/\bt="([^"]+)"/)||[])[1];
 if(t==='inlineStr')return [...cell.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decodeXml(m[1])).join('');
 const vm=cell.match(/<v>([\s\S]*?)<\/v>/);if(!vm)return '';
 const raw=decodeXml(vm[1]);
 if(t==='s')return shared[Number(raw)]??'';
 if(t==='str')return raw;
 return /^-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?$/.test(raw)?Number(raw):raw
}
function parseWorksheet(xml,shared){
 const rows=[];
 for(const rm of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
  const obj={};
  const cellRe=/<c\b[^>]*\br="([A-Z]+)\d+"[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\br="([A-Z]+)\d+"[^>]*\/>/g;
  for(const cm of rm[1].matchAll(cellRe)){const cell=cm[0],col=cm[1]||cm[2];obj[col]=cellValue(cell,shared)}
  rows.push(obj)
 }
 return rows
}
function normalizeExcelDate(v){
 if(typeof v==='string'){
  const s=v.trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10)
 }
 if(typeof v==='number'&&v>20000&&v<80000)return fmtDate(Date.UTC(1899,11,30)+Math.floor(v)*86400000);
 return null
}
function dataRetentionStart(c){
 if(c==='MX'&&state.countries.MX.quarter)return state.countries.MX.quarter.start;
 return minS(state.countries[c].activities.map(a=>a.start))
}
async function parseLingxingExcel(file){
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const sheetNames=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
 if(!sheetNames.length)throw new Error('Excel 中没有找到工作表');
 const sharedFile=zip.file('xl/sharedStrings.xml'),shared=sharedFile?parseSharedStrings(await sharedFile.async('text')):[];
 const rows=parseWorksheet(await zip.file(sheetNames[0]).async('text'),shared);
 if(rows.length<2)throw new Error('Excel 没有可读取的数据行');
 const header=rows[0],findCol=name=>Object.keys(header).find(k=>String(header[k]??'').trim()===name);
 const cCol=findCol('国家'),dCol=findCol('日期'),sCol=findCol('花费');
 if(!cCol||!dCol||!sCol)throw new Error('未找到“国家 / 日期 / 花费”列，请确认使用领星广告组合每日明细');
 const agg={AE:{},SA:{},MX:{}},coverage={AE:[],SA:[],MX:[]};
 for(const r of rows.slice(1)){
  const c=String(r[cCol]??'').trim().toUpperCase();if(!agg[c])continue;
  const dt=normalizeExcelDate(r[dCol]);if(!dt)continue;
  let spend=Number(String(r[sCol]??0).replace(/,/g,''));if(!Number.isFinite(spend))spend=0;
  agg[c][dt]=(agg[c][dt]||0)+spend;coverage[c].push(dt)
 }
 for(const c of ['AE','SA','MX'])if(!coverage[c].length)throw new Error(`Excel 中没有识别到 ${c} 数据`);
 return {agg,coverage}
}
function continuousRows(dayMap,start,end){
 const out=[];let guard=0;
 for(let cur=start;cur<=end&&guard<1200;cur=addDays(cur,1),guard++)out.push([cur,Number((dayMap[cur]||0).toFixed(10))]);
 return out
}
async function applyImportedData(parsed,file){
 const summary=[];
 for(const c of visibleCountries()){
  const rawMin=minS(parsed.coverage[c]),rawMax=maxS(parsed.coverage[c]),keepStart=dataRetentionStart(c),start=maxS([rawMin,keepStart]),end=rawMax;
  if(end<keepStart)throw new Error(`${c} 文件日期早于看板需要的起始日期 ${keepStart}`);
  const fresh=continuousRows(parsed.agg[c],start,end);
  if(start<=keepStart){
   state.countries[c].daily=fresh;
  }else{
   const outside=state.countries[c].daily.filter(r=>r[0]<start||r[0]>end);
   state.countries[c].daily=outside.concat(fresh).filter(r=>r[0]>=keepStart).sort((a,b)=>a[0].localeCompare(b[0]))
  }
  summary.push(`${c} ${start}–${end}`)
 }
 state.sourceFile=file.name;
 state.meta={lastImportName:file.name,lastImportAt:new Date().toLocaleString('zh-CN'),mode:'browser-import'};
 await cloudSave();render();
 showToast(`更新完成并已同步到共享数据库：${summary.join('；')}。预算、汇率和活动设置均已保留。`)
}
document.getElementById('updateDataBtn').onclick=()=>{if(accessInfo?.role==='viewer')return;document.getElementById('excelInput').click()};
document.getElementById('excelInput').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 const btn=document.getElementById('updateDataBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='读取中…';
 try{await applyImportedData(await parseLingxingExcel(file),file)}
 catch(err){console.error(err);showToast('更新失败：'+(err?.message||String(err)),true)}
 finally{btn.disabled=false;btn.textContent=old;e.target.value=''}
};

document.getElementById('loginForm').onsubmit=async e=>{
 e.preventDefault();
 const btn=document.getElementById('loginBtn'),msg=document.getElementById('authMsg');
 btn.disabled=true;btn.textContent='登录中…';msg.textContent='';
 try{
  await login(document.getElementById('loginEmail').value.trim(),document.getElementById('loginPassword').value);
  await bootAuthenticated()
 }catch(err){msg.textContent=err?.message||String(err)}
 finally{btn.disabled=false;btn.textContent='登录'}
};
document.getElementById('logoutBtn').onclick=async()=>{
 try{
  if(authSession?.access_token)await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:authHeaders()})
 }catch(e){}
 clearSession();location.reload()
};
try{
 const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
 if(s){authSession=s;bootAuthenticated()}
}catch(e){}

/* ===== Portfolio-level activity mapping (AE RM17 new-product portfolios) ===== */
const PORTFOLIO_ACTIVITY_RULES={
 AE:{
  'RM 17 新品':['Smartphone-RM17','Smartphone-RM17_5G','Smartphone-SB-入门']
 }
};
function normalizePortfolioKey(v){
 return String(v??'').trim().toLowerCase()
  .replace(/[‐‑‒–—﹘﹣－]/g,'-')
  .replace(/_/g,'-')
  .replace(/\s+/g,'');
}
function mappedActivityName(c,portfolioName){
 const rules=PORTFOLIO_ACTIVITY_RULES[c]||{},key=normalizePortfolioKey(portfolioName);
 for(const [activity,names] of Object.entries(rules)){
  if(names.some(x=>normalizePortfolioKey(x)===key))return activity;
 }
 return null
}
function portfolioRowsByDate(c){
 const out={},pd=state.countries[c]?.portfolioDaily||{};
 for(const [portfolio,rows] of Object.entries(pd)){
  for(const r of rows||[]){
   const dt=r[0],spend=Number(r[1]||0);
   if(!out[dt])out[dt]=[];
   out[dt].push([portfolio,spend])
  }
 }
 return out
}
dailyAllocations=function(c){
 const co=state.countries[c],map={},rules=PORTFOLIO_ACTIVITY_RULES[c]||{},byDate=portfolioRowsByDate(c);
 const mappedIndices=new Set(
  Object.keys(rules).map(name=>co.activities.findIndex(a=>a.name===name)).filter(i=>i>=0)
 );
 co.daily.forEach(r=>{
  const dt=r[0],tax=1+Number(state.taxRate||0),totalUSD=Number(r[1]||0)*tax/co.fx,detail=byDate[dt]||[];
  if(!detail.length){
   const w=co.activities.map(a=>planDay(a,dt)),tot=w.reduce((s,z)=>s+z,0);
   map[dt]=co.activities.map((a,i)=>tot>0?totalUSD*w[i]/tot:0);
   return
  }
  const arr=co.activities.map(()=>0);
  for(const [portfolio,localSpend] of detail){
   const activityName=mappedActivityName(c,portfolio);
   if(!activityName)continue;
   const i=co.activities.findIndex(a=>a.name===activityName);
   if(i<0)continue;
   const a=co.activities[i];
   if(dt<a.start||dt>a.end)continue;
   arr[i]+=Number(localSpend||0)*tax/co.fx
  }
  let exactTotal=arr.reduce((s,v)=>s+v,0);
  if(exactTotal>totalUSD&&exactTotal>0){
   const k=totalUSD/exactTotal;
   for(let i=0;i<arr.length;i++)arr[i]*=k;
   exactTotal=totalUSD
  }
  const residual=Math.max(0,totalUSD-exactTotal);
  const w=co.activities.map((a,i)=>mappedIndices.has(i)?0:planDay(a,dt)),tot=w.reduce((s,z)=>s+z,0);
  if(tot>0)for(let i=0;i<arr.length;i++)arr[i]+=residual*w[i]/tot;
  map[dt]=arr
 });
 return map
};

parseLingxingExcel=async function(file){
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const sheetNames=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
 if(!sheetNames.length)throw new Error('Excel 中没有找到工作表');
 const sharedFile=zip.file('xl/sharedStrings.xml'),shared=sharedFile?parseSharedStrings(await sharedFile.async('text')):[];
 const rows=parseWorksheet(await zip.file(sheetNames[0]).async('text'),shared);
 if(rows.length<2)throw new Error('Excel 没有可读取的数据行');
 const header=rows[0];
 const headerText=k=>String(header[k]??'').trim();
 const findExact=names=>Object.keys(header).find(k=>names.some(n=>headerText(k).toLowerCase()===n.toLowerCase()));
 const cCol=findExact(['国家']),dCol=findExact(['日期']),sCol=findExact(['花费']);
 let pCol=findExact(['广告组合','广告组合名称','广告组合名','Portfolio','Portfolio Name']);
 if(!pCol)pCol=Object.keys(header).find(k=>{
  const h=headerText(k);
  return ((/广告组合/i.test(h)||/portfolio/i.test(h))&&!/(^|[^a-z])id([^a-z]|$)/i.test(h))
 });
 if(!cCol||!dCol||!sCol)throw new Error('未找到“国家 / 日期 / 花费”列，请确认使用领星广告组合每日明细');
 const agg={AE:{},SA:{},MX:{}},coverage={AE:[],SA:[],MX:[]},portfolioAgg={AE:{},SA:{},MX:{}};
 for(const r of rows.slice(1)){
  const c=String(r[cCol]??'').trim().toUpperCase();if(!agg[c])continue;
  const dt=normalizeExcelDate(r[dCol]);if(!dt)continue;
  let spend=Number(String(r[sCol]??0).replace(/,/g,''));if(!Number.isFinite(spend))spend=0;
  agg[c][dt]=(agg[c][dt]||0)+spend;coverage[c].push(dt);
  if(pCol){
   const portfolio=String(r[pCol]??'').trim()||'（未命名广告组合）';
   if(!portfolioAgg[c][portfolio])portfolioAgg[c][portfolio]={};
   portfolioAgg[c][portfolio][dt]=(portfolioAgg[c][portfolio][dt]||0)+spend
  }
 }
 for(const c of ['AE','SA','MX'])if(!coverage[c].length)throw new Error(`Excel 中没有识别到 ${c} 数据`);
 return {agg,coverage,portfolioAgg,hasPortfolio:Boolean(pCol)}
};
function portfolioSparseRows(portfolioAgg,start,end){
 const out={};
 for(const [portfolio,dayMap] of Object.entries(portfolioAgg||{})){
  const rows=Object.entries(dayMap).filter(([dt])=>dt>=start&&dt<=end)
   .sort((a,b)=>a[0].localeCompare(b[0]))
   .map(([dt,v])=>[dt,Number(Number(v||0).toFixed(10))]);
  if(rows.length)out[portfolio]=rows
 }
 return out
}
function mergePortfolioDaily(existing,fresh,start,end,keepStart,replaceAll){
 const out={};
 if(!replaceAll){
  for(const [portfolio,rows] of Object.entries(existing||{})){
   const kept=(rows||[]).filter(r=>r[0]>=keepStart&&(r[0]<start||r[0]>end));
   if(kept.length)out[portfolio]=kept
  }
 }
 for(const [portfolio,rows] of Object.entries(fresh||{})){
  const merged=(out[portfolio]||[]).concat(rows).sort((a,b)=>a[0].localeCompare(b[0]));
  if(merged.length)out[portfolio]=merged
 }
 return out
}
applyImportedData=async function(parsed,file){
 const summary=[];
 for(const c of visibleCountries()){
  const rawMin=minS(parsed.coverage[c]),rawMax=maxS(parsed.coverage[c]),keepStart=dataRetentionStart(c),start=maxS([rawMin,keepStart]),end=rawMax;
  if(end<keepStart)throw new Error(`${c} 文件日期早于看板需要的起始日期 ${keepStart}`);
  const fresh=continuousRows(parsed.agg[c],start,end),replaceAll=start<=keepStart;
  if(replaceAll){
   state.countries[c].daily=fresh;
  }else{
   const outside=state.countries[c].daily.filter(r=>r[0]<start||r[0]>end);
   state.countries[c].daily=outside.concat(fresh).filter(r=>r[0]>=keepStart).sort((a,b)=>a[0].localeCompare(b[0]))
  }
  if(parsed.hasPortfolio){
   const freshPortfolio=portfolioSparseRows(parsed.portfolioAgg[c],start,end);
   state.countries[c].portfolioDaily=mergePortfolioDaily(state.countries[c].portfolioDaily,freshPortfolio,start,end,keepStart,replaceAll)
  }
  summary.push(`${c} ${start}–${end}`)
 }
 const aeMatched=parsed.hasPortfolio
  ?Object.keys(parsed.portfolioAgg.AE||{}).filter(p=>mappedActivityName('AE',p)==='RM 17 新品')
  :[];
 state.sourceFile=file.name;
 state.meta={
  lastImportName:file.name,
  lastImportAt:new Date().toLocaleString('zh-CN'),
  mode:'browser-import',
  portfolioLevel:Boolean(parsed.hasPortfolio),
  aeNewProductPortfolios:aeMatched
 };
 await cloudSave();render();
 const detailMsg=parsed.hasPortfolio
  ?`；AE 新品已识别 ${aeMatched.length} 个广告组合`
  :'；未找到广告组合列，活动花费仍使用原分摊逻辑';
 showToast(`更新完成并已同步到共享数据库：${summary.join('；')}${detailMsg}。预算、汇率和活动设置均已保留。`)
};

try{
 if(typeof COLS!=='undefined'&&COLS.actual)COLS.actual.label='实际归属花费';
 const foot=document.querySelector('.foot');
 if(foot)foot.textContent='时间进度 = 活动已过天数 ÷ 活动总天数；花费进度 = 实际花费 ÷ 活动预算。蓝色实际线历史上超过灰色计划线，代表当日开始“超计划”；橙色虚线是按近 3 日日均外推的预测，可以在尚未超计划时提前暴露未来超预算风险。已配置广告组合识别规则的活动按广告组合实际花费归属；其他重叠活动仍按计划日流速比例分摊。';
 const baseRenderSnapshot=renderSnapshot;
 renderSnapshot=function(){
  baseRenderSnapshot();
  const el=document.getElementById('activitySnapshot');
  if(el)el.innerHTML=el.innerHTML.replace(/分摊流速/g,'归属流速')
 }
}catch(e){console.warn('Portfolio mapping UI wording update skipped',e)}
