const COLS={
 activity:{label:'活动',cell:(c,s)=>`<b>${s.a.name}</b>`},
 type:{label:'类型',cell:(c,s)=>s.a.type},
 status:{label:'状态',cell:(c,s)=>`<span class="tag">${s.status}</span>`},
 period:{label:'周期',cell:(c,s)=>`${sdate(s.a.start)}–${sdate(s.a.end)}`},
 timeProgress:{label:'时间进度',num:true,cell:(c,s)=>pct(s.tp)},
 spendProgress:{label:'花费进度',num:true,cell:(c,s)=>pct(s.sp)},
 paceIndex:{label:'花费/时间',num:true,cell:(c,s)=>pct(s.pace)},
 budget:{label:'活动预算',num:true,cell:(c,s)=>money(s.budget,c,0)},
 actual:{label:'实际分摊花费',num:true,cell:(c,s)=>money(s.act,c,0)},
 remaining:{label:'剩余',num:true,cell:(c,s)=>money(s.rem,c,0)},
 recent3:{label:'近 3 日日均',num:true,cell:(c,s)=>money(s.recent,c,1)},
 support:{label:'后续可支撑日均',num:true,cell:(c,s)=>money(s.support,c,1)},
 forecast:{label:'预计期末花费',num:true,cell:(c,s)=>money(s.forecast,c,0)},
 variance:{label:'预计超支 / 结余',num:true,cell:(c,s)=>s.forecast===null?'—':(s.variance>0?'超 '+money(s.variance,c,0):'余 '+money(Math.abs(s.variance),c,0))},
 expected:{label:'截至当前应花',num:true,cell:(c,s)=>money(s.exp,c,0)},
 pacingGap:{label:'Pacing Gap',num:true,cell:(c,s)=>{const g=s.act-s.exp;return (g>=0?'+':'')+money(g,c,0)}}
};
function renderTable(){
 const c=selectedCountry,co=state.countries[c],head=document.getElementById('activityHead'),tb=document.getElementById('activityTable');
 head.innerHTML='<tr>'+colOrder.map(k=>`<th draggable="true" data-col="${k}" style="${COLS[k].num?'text-align:right':''}">${COLS[k].label}</th>`).join('')+'</tr>';
 tb.innerHTML=co.activities.map((a,i)=>{const s=activityStats(c,i);return '<tr>'+colOrder.map(k=>`<td class="${COLS[k].num?'n':''}">${COLS[k].cell(c,s)}</td>`).join('')+'</tr>'}).join('');
 let dragKey=null;
 head.querySelectorAll('th').forEach(th=>{
  th.addEventListener('dragstart',e=>{dragKey=th.dataset.col;th.classList.add('dragging');e.dataTransfer.setData('text/plain',dragKey);e.dataTransfer.effectAllowed='move'});
  th.addEventListener('dragend',()=>{th.classList.remove('dragging');head.querySelectorAll('th').forEach(x=>x.classList.remove('drop-target'))});
  th.addEventListener('dragover',e=>{e.preventDefault();head.querySelectorAll('th').forEach(x=>x.classList.remove('drop-target'));th.classList.add('drop-target')});
  th.addEventListener('drop',e=>{e.preventDefault();const from=dragKey||e.dataTransfer.getData('text/plain'),to=th.dataset.col;if(from&&to&&from!==to){const fi=colOrder.indexOf(from),ti=colOrder.indexOf(to);colOrder.splice(fi,1);colOrder.splice(ti,0,from);save();renderTable()}});
 })
}
function renderEditor(){
 document.getElementById('rmb').value=state.rmbFx;document.getElementById('tax').value=state.taxRate;document.getElementById('rmb').disabled=accessInfo?.role!=='admin';document.getElementById('tax').disabled=accessInfo?.role!=='admin';document.getElementById('aefx').value=state.countries.AE.fx;document.getElementById('safx').value=state.countries.SA.fx;document.getElementById('mxfx').value=state.countries.MX.fx;document.getElementById('q3b').value=state.countries.MX.quarter.budgetUSD;
 const tb=document.getElementById('editRows');tb.innerHTML='';
 visibleCountries().forEach(c=>state.countries[c].activities.forEach((a,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${c}</b></td><td><input data-c="${c}" data-i="${i}" data-k="name" value="${a.name}"></td><td><select data-c="${c}" data-i="${i}" data-k="type"><option ${a.type==='常促'?'selected':''}>常促</option><option ${a.type==='新品'?'selected':''}>新品</option><option ${a.type==='大促'?'selected':''}>大促</option><option ${a.type==='其他'?'selected':''}>其他</option></select></td><td><input type="date" data-c="${c}" data-i="${i}" data-k="start" value="${a.start}"></td><td><input type="date" data-c="${c}" data-i="${i}" data-k="end" value="${a.end}"></td><td><input type="number" data-c="${c}" data-i="${i}" data-k="baseUSD" value="${a.baseUSD}"></td><td><input type="number" data-c="${c}" data-i="${i}" data-k="carryoverUSD" value="${a.carryoverUSD||0}"></td><td><button class="btn" data-del="${c}:${i}">删除</button></td>`;tb.appendChild(tr)}));
 tb.querySelectorAll('input,select').forEach(x=>x.onchange=e=>{const c=e.target.dataset.c,i=+e.target.dataset.i,k=e.target.dataset.k;state.countries[c].activities[i][k]=(k==='baseUSD'||k==='carryoverUSD')?+e.target.value:e.target.value;save();renderEditor()});
 tb.querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>{const [c,i]=x.dataset.del.split(':');state.countries[c].activities.splice(+i,1);save();renderEditor()})
}
document.getElementById('countrySeg').onclick=e=>{if(e.target.dataset.country){selectedCountry=e.target.dataset.country;selectedActivity='ALL';render()}};
document.getElementById('curSeg').onclick=e=>{if(e.target.dataset.cur){currency=e.target.dataset.cur;render()}};
document.getElementById('editBtn').onclick=()=>{if(accessInfo?.role==='viewer')return;document.getElementById('mask').classList.add('open');renderEditor()};
document.getElementById('close').onclick=document.getElementById('done').onclick=()=>{document.getElementById('mask').classList.remove('open');render()};
document.getElementById('mask').onclick=e=>{if(e.target.id==='mask'){e.currentTarget.classList.remove('open');render()}};
[['rmb','rmbFx'],['tax','taxRate']].forEach(([id,k])=>document.getElementById(id).onchange=e=>{state[k]=+e.target.value;save();renderEditor()});
[['aefx','AE'],['safx','SA'],['mxfx','MX']].forEach(([id,c])=>document.getElementById(id).onchange=e=>{state.countries[c].fx=+e.target.value;save();renderEditor()});
document.getElementById('q3b').onchange=e=>{state.countries.MX.quarter.budgetUSD=+e.target.value;save();renderEditor()};
document.getElementById('add').onclick=()=>{const c=selectedCountry==='ALL'?(visibleCountries()[0]||'AE'):selectedCountry,dt=maxS(visibleCountries().map(anchor));state.countries[c].activities.push({name:'新活动',type:'其他',start:addDays(dt,1),end:addDays(dt,30),baseUSD:0,carryoverUSD:0});save();renderEditor()};
document.getElementById('reset').onclick=()=>{if(confirm('恢复原始活动预算与汇率？已导入的花费历史会保留。')){
 const keepDaily={AE:state.countries.AE.daily,SA:state.countries.SA.daily,MX:state.countries.MX.daily},keepMeta=state.meta,keepSource=state.sourceFile;
 state=JSON.parse(JSON.stringify(ORIGINAL));
 ['AE','SA','MX'].forEach(c=>state.countries[c].daily=keepDaily[c]);
 state.meta=keepMeta;state.sourceFile=keepSource;colOrder=DEFAULT_COLS.slice();save();renderEditor();render()
}};