window.onerror=function(msg,src,line){document.body.innerHTML='<div class="error"><b>页面运行异常</b><br>'+String(msg)+'<br>Line '+line+'</div>'};
const ORIGINAL={"sourceFile":"Xiaomi H.K Limited SA-SA等3个店铺-广告组合-0701-0811-每日明细-946048309846417408.xlsx","taxRate":0.02,"rmbFx":6.98,"countries":{"AE":{"fullName":"阿联酋","local":"AED","fx":3.67,"daily":[["2026-08-01",248.26],["2026-08-02",329.53],["2026-08-03",261.81],["2026-08-04",256.16],["2026-08-05",288.04],["2026-08-06",329.05],["2026-08-07",422.32],["2026-08-08",453.1],["2026-08-09",536.49],["2026-08-10",425.61],["2026-08-11",368.86]],"activities":[{"name":"常促","type":"常促","start":"2026-08-01","end":"2026-08-31","baseUSD":3500,"carryoverUSD":0},{"name":"RM 17 新品","type":"新品","start":"2026-08-19","end":"2026-09-17","baseUSD":1500,"carryoverUSD":294.8147138964578}]},"SA":{"fullName":"沙特","local":"SAR","fx":3.75,"daily":[["2026-08-01",281.64],["2026-08-02",226.75],["2026-08-03",263.05],["2026-08-04",255.38],["2026-08-05",162.71],["2026-08-06",189.2],["2026-08-07",239.49],["2026-08-08",244.18],["2026-08-09",165.92],["2026-08-10",254.58],["2026-08-11",219.94]],"activities":[{"name":"常促","type":"常促","start":"2026-08-01","end":"2026-08-31","baseUSD":2000,"carryoverUSD":0},{"name":"新品","type":"新品","start":"2026-08-26","end":"2026-09-08","baseUSD":2000,"carryoverUSD":0}]},"MX":{"fullName":"墨西哥","local":"MXN","fx":17.22,"daily":[["2026-07-01",3728.28],["2026-07-02",4979.02],["2026-07-03",5869.01],["2026-07-04",7016.32],["2026-07-05",7312.97],["2026-07-06",6408.52],["2026-07-07",7055.22],["2026-07-08",6717.98],["2026-07-09",4728.01],["2026-07-10",3739.0],["2026-07-11",4965.32],["2026-07-12",5193.75],["2026-07-13",3809.35],["2026-07-14",2944.15],["2026-07-15",2300.62],["2026-07-16",3167.81],["2026-07-17",3785.51],["2026-07-18",3349.91],["2026-07-19",1942.13],["2026-07-20",2041.43],["2026-07-21",1791.05],["2026-07-22",1365.47],["2026-07-23",1114.01],["2026-07-24",763.24],["2026-07-25",721.89],["2026-07-26",820.63],["2026-07-27",792.0],["2026-07-28",670.16],["2026-07-29",827.56],["2026-07-30",784.61],["2026-07-31",880.83],["2026-08-01",738.14],["2026-08-02",766.51],["2026-08-03",735.29],["2026-08-04",887.06],["2026-08-05",836.06],["2026-08-06",800.71],["2026-08-07",738.89],["2026-08-08",784.91],["2026-08-09",776.97],["2026-08-10",736.39],["2026-08-11",796.1]],"activities":[{"name":"常促","type":"常促","start":"2026-08-01","end":"2026-08-31","baseUSD":1800,"carryoverUSD":0},{"name":"小米节","type":"大促","start":"2026-08-20","end":"2026-08-31","baseUSD":9000,"carryoverUSD":0}],"quarter":{"name":"Q3","start":"2026-07-01","end":"2026-09-30","budgetUSD":21226}}},"meta":{"lastImportName":"Xiaomi H.K Limited SA-SA等3个店铺-广告组合-0701-0811-每日明细-946048309846417408.xlsx","lastImportAt":"内置初始数据：2026-08-11","mode":"full-history"}};
let state=JSON.parse(JSON.stringify(ORIGINAL));
let selectedCountry='ALL',currency='USD',selectedActivity='ALL';
const DEFAULT_COLS=['activity','type','status','period','timeProgress','spendProgress','paceIndex','budget','actual','remaining','recent3','support','forecast','variance','expected','pacingGap'];
let colOrder=DEFAULT_COLS.slice();

const SUPABASE_URL="https://cwbfscsymhygkmfkmaqa.supabase.co";
const SUPABASE_KEY="sb_publishable_jO8EEDf6DSjzwVLM_ef_zg_Ulajb9J9";
const SESSION_KEY='spend-dashboard-v6-session';
let authSession=null, accessInfo=null, cloudSaving=false, initialized=false, cloudSaveTimer=null;

function visibleCountries(){
 const all=['AE','SA','MX'];
 if(!accessInfo)return all.filter(c=>state.countries?.[c]);
 if(accessInfo.role==='admin')return all.filter(c=>state.countries?.[c]);
 return (accessInfo.countries||[]).filter(c=>state.countries?.[c]);
}
function setSync(status='ok'){
 const d=document.getElementById('syncDot');if(!d)return;
 d.className='sync-dot'+(status==='busy'?' busy':status==='err'?' err':'')
}
function authHeaders(){
 return {'apikey':SUPABASE_KEY,'Authorization':'Bearer '+authSession.access_token,'Content-Type':'application/json'}
}
function storeSession(s){
 authSession=s;
 try{localStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch(e){}
}
function clearSession(){
 authSession=null;accessInfo=null;
 try{localStorage.removeItem(SESSION_KEY)}catch(e){}
}
function sessionExpired(s){
 if(!s||!s.access_token)return true;
 if(!s.expires_at)return false;
 return Date.now()/1000 > Number(s.expires_at)-45
}
async function refreshSession(){
 if(!authSession?.refresh_token)throw new Error('登录已过期，请重新登录');
 const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',
  headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({refresh_token:authSession.refresh_token})
 });
 const x=await res.json();
 if(!res.ok)throw new Error(x?.msg||x?.message||x?.error_description||'登录已过期，请重新登录');
 x.expires_at=Math.floor(Date.now()/1000)+Number(x.expires_in||3600);
 storeSession(x);return x
}
async function ensureSession(){
 if(sessionExpired(authSession))await refreshSession()
}
async function login(email,password){
 const res=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
  method:'POST',
  headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({email,password})
 });
 const x=await res.json();
 if(!res.ok)throw new Error(x?.msg||x?.message||x?.error_description||'邮箱或密码不正确');
 x.expires_at=Math.floor(Date.now()/1000)+Number(x.expires_in||3600);
 storeSession(x);return x
}
async function cloudLoad(){
 await ensureSession();setSync('busy');
 const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/get_spend_dashboard',{
  method:'POST',headers:authHeaders(),body:'{}'
 });
 const x=await res.json();
 if(!res.ok){setSync('err');throw new Error(x?.message||'读取共享数据失败')}
 state=x.state||JSON.parse(JSON.stringify(ORIGINAL));
 if(Array.isArray(x.column_order)&&x.column_order.length)colOrder=x.column_order;
 accessInfo=x.access||{};
 setSync('ok');applyAccessUI();return x
}
function save(){return cloudSave()}
function cloudSave(){
 if(!initialized||!authSession||accessInfo?.role==='viewer')return Promise.resolve();
 clearTimeout(cloudSaveTimer);
 return new Promise((resolve,reject)=>{
  cloudSaveTimer=setTimeout(async()=>{
   if(cloudSaving){resolve();return}
   cloudSaving=true;
   try{
    await ensureSession();setSync('busy');
    const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/save_spend_dashboard',{
     method:'POST',headers:authHeaders(),
     body:JSON.stringify({p_state:state,p_column_order:colOrder})
    });
    const x=await res.json();
    if(!res.ok)throw new Error(x?.message||'保存失败');
    setSync('ok');resolve(x)
   }catch(e){
    setSync('err');showToast('云端保存失败：'+(e?.message||String(e)),true);reject(e)
   }finally{cloudSaving=false}
  },180)
 })
}
function applyAccessUI(){
 const role=accessInfo?.role||'viewer',editable=role==='admin'||role==='editor';
 document.getElementById('userChip').style.display='flex';
 document.getElementById('userEmail').textContent=authSession?.user?.email||'';
 document.getElementById('userRole').textContent='· '+({admin:'管理员',editor:'编辑',viewer:'只读'}[role]||role);
 document.getElementById('readonlyBanner').classList.toggle('show',!editable);
 document.getElementById('updateDataBtn').disabled=!editable;
 document.getElementById('editBtn').disabled=!editable;
 const allowed=visibleCountries();
 document.querySelectorAll('#countrySeg button[data-country]').forEach(b=>{
  if(b.dataset.country==='ALL')return;
  b.style.display=allowed.includes(b.dataset.country)?'':'none';
 });
}
async function bootAuthenticated(){
 try{
  await cloudLoad();
  initialized=true;
  if(selectedCountry!=='ALL'&&!visibleCountries().includes(selectedCountry))selectedCountry='ALL';
  render();
  document.getElementById('authGate').classList.add('hidden')
 }catch(e){
  clearSession();
  document.getElementById('authGate').classList.remove('hidden');
  document.getElementById('authMsg').textContent=e?.message||String(e)
 }
}

function parse(s){const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)}
function fmtDate(ms){return new Date(ms).toISOString().slice(0,10)}
function addDays(s,n){return fmtDate(parse(s)+n*86400000)}
function days(a,b){return Math.round((parse(b)-parse(a))/86400000)+1}
function minS(a){return a.slice().sort()[0]}function maxS(a){return a.slice().sort().slice(-1)[0]}
function bud(a){return Number(a.baseUSD||0)+Number(a.carryoverUSD||0)}
function anchor(c){const r=state.countries[c].daily;return r.length?maxS(r.map(x=>x[0])):null}
function conv(v,c){if(currency==='USD')return v;if(currency==='RMB')return v*state.rmbFx;return v*state.countries[c].fx}
function sym(c){if(currency==='USD')return '$';if(currency==='RMB')return '¥';return state.countries[c].local+' '}
function money(v,c,d=0){if(v===null||v===undefined||Number.isNaN(v))return '—';const x=conv(v,c);return sym(c)+Number(x).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d})}
function pct(x,d=1){if(x===null||x===undefined||Number.isNaN(x))return '—';return (x*100).toFixed(d)+'%'}
function sdate(s){const [y,m,d]=s.split('-');return Number(m)+'/'+Number(d)}
function planDay(a,dt){return dt>=a.start&&dt<=a.end?bud(a)/days(a.start,a.end):0}
function expected(a,dt){if(dt<a.start)return 0;const e=dt>a.end?a.end:dt;return bud(a)*Math.min(1,days(a.start,e)/days(a.start,a.end))}
function timeProgress(a,dt){if(dt<a.start)return 0;if(dt>a.end)return 1;return days(a.start,dt)/days(a.start,a.end)}
function dailyAllocations(c){
 const co=state.countries[c],map={};
 co.daily.forEach(r=>{
  const dt=r[0],totalUSD=Number(r[1]||0)*(1+Number(state.taxRate||0))/co.fx,w=co.activities.map(a=>planDay(a,dt)),tot=w.reduce((s,z)=>s+z,0);
  map[dt]=co.activities.map((a,i)=>tot>0?totalUSD*w[i]/tot:0)
 });return map
}
function allocations(c){
 const co=state.countries[c],map=dailyAllocations(c),out=co.activities.map(()=>0);
 Object.values(map).forEach(arr=>arr.forEach((v,i)=>out[i]+=v));return out
}
function recentActivityUSD(c,index,n=3){
 const map=dailyAllocations(c),a=state.countries[c].activities[index];
 const dates=Object.keys(map).filter(dt=>dt>=a.start&&dt<=a.end).sort().slice(-n);
 if(!dates.length)return 0;
 return dates.reduce((s,dt)=>s+(map[dt][index]||0),0)/dates.length
}
function activityDate(c,dt){return state.countries[c].activities.some(a=>dt>=a.start&&dt<=a.end)}
function recentCountryUSD(c,n=3){
 const co=state.countries[c],r=co.daily.filter(x=>activityDate(c,x[0])).sort((a,b)=>a[0].localeCompare(b[0])).slice(-n);
 return r.reduce((s,x)=>s+Number(x[1]||0),0)*(1+Number(state.taxRate||0))/co.fx/Math.max(1,r.length)
}
function actualCountryUSD(c){
 const co=state.countries[c];
 return co.daily.filter(x=>activityDate(c,x[0])).reduce((s,x)=>s+Number(x[1]||0),0)*(1+Number(state.taxRate||0))/co.fx
}
function activityStats(c,index){
 const co=state.countries[c],dt=anchor(c),a=co.activities[index],alloc=allocations(c),act=alloc[index],budget=bud(a),exp=expected(a,dt),tp=timeProgress(a,dt),sp=budget?act/budget:0,pace=tp>0?sp/tp:null,rem=Math.max(0,budget-act);
 const status=dt<a.start?'待启动':dt>a.end?'已结束':'生效中';
 const nextStart=maxS([addDays(dt,1),a.start]),left=nextStart<=a.end?days(nextStart,a.end):0,support=left?rem/left:0,recent=recentActivityUSD(c,index,3);
 let forecast=null,variance=null,exhaust=null,cross=null;
 if(status==='生效中'){
  forecast=act+recent*left;variance=forecast-budget;
  if(recent>0&&rem/recent<=left)exhaust=addDays(dt,Math.ceil(rem/recent));
  let curAct=act,guard=0;
  for(let cur=addDays(dt,1);cur<=a.end&&guard<400;cur=addDays(cur,1),guard++){
   curAct+=recent;
   if(curAct>expected(a,cur)+1e-9){cross=cur;break}
  }
 }else if(status==='已结束'){forecast=act;variance=act-budget}
 return {a,act,budget,exp,tp,sp,pace,rem,status,left,support,recent,forecast,variance,exhaust,cross}
}
function activeIndexes(c){const dt=anchor(c);return state.countries[c].activities.map((a,i)=>({a,i})).filter(x=>dt>=x.a.start&&dt<=x.a.end)}
function activeStats(c){
 const acts=activeIndexes(c),stats=acts.map(x=>activityStats(c,x.i));
 return {names:stats.map(s=>s.a.name).join(' + ')||'无当前活动',remaining:stats.reduce((s,x)=>s+x.rem,0),support:stats.reduce((s,x)=>s+x.support,0),stats}
}
function overall(c){
 const co=state.countries[c],dt=anchor(c),act=actualCountryUSD(c),exp=co.activities.reduce((s,a)=>s+expected(a,dt),0),as=activeStats(c),r3=recentCountryUSD(c,3);
 return {dt,act,exp,completion:exp?act/exp:1,r3,remaining:as.remaining,support:as.support,active:as.names,lift:as.support-r3,activeStats:as.stats}
}
function currentRisk(c){
 const m=overall(c);
 if(m.activeStats.length===1){
  const s=m.activeStats[0];
  if(s.forecast!==null&&s.variance>0)return {kind:'risk',label:'超支风险',s};
  if(s.support>0&&s.recent<s.support*.95)return {kind:'lift',label:'可提拉',s};
  return {kind:'ok',label:'流速可控',s}
 }
 if(m.r3>m.support*1.05)return {kind:'risk',label:'超支风险',s:null};
 if(m.r3<m.support*.95)return {kind:'lift',label:'可提拉',s:null};
 return {kind:'ok',label:'流速可控',s:null}
}
function upcoming(c){const dt=anchor(c),xs=state.countries[c].activities.filter(a=>a.start>dt).sort((x,y)=>x.start.localeCompare(y.start));return xs[0]||null}
function q3Html(c,m){
 if(c!=='MX'||!state.countries.MX.quarter)return '';
 const q=state.countries.MX.quarter,localSpent=state.countries.MX.daily.filter(r=>r[0]>=q.start&&r[0]<=q.end&&r[0]<=m.dt).reduce((s,r)=>s+Number(r[1]||0),0),spent=localSpent*(1+Number(state.taxRate||0))/state.countries.MX.fx,prog=spent/q.budgetUSD,time=days(q.start,m.dt)/days(q.start,q.end),rem=q.budgetUSD-spent,left=days(addDays(m.dt,1),q.end),daily=rem/left;
 return `<div class="q3box"><div class="flow-title"><span>Q3 额外监控</span><span>${pct(prog)} 已花</span></div><div class="q3-grid"><div><span>时间进度</span><b>${pct(time)}</b></div><div><span>Q3 剩余</span><b>${money(rem,c,0)}</b></div><div><span>Q3 剩余日均可支撑</span><b>${money(daily,c,0)}</b></div></div></div>`
}