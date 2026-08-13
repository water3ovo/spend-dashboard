function cardHtml(c,detail=false){
 const co=state.countries[c],m=overall(c),risk=currentRisk(c),up=upcoming(c),s=risk.s;
 let summary='';
 const cumulative=m.completion<.92?'累计仍低于计划':m.completion>1.08?'累计已高于计划':'累计基本贴合计划';
 if(risk.kind==='risk'&&s){
  summary=`${cumulative}，但当前流速已经高于剩余预算可支撑速度。若近 3 日流速维持，预计期末 ${money(s.forecast,c,0)}，约超预算 ${money(s.variance,c,0)}${s.cross?'，预计 '+sdate(s.cross)+' 开始超过计划线':''}${s.exhaust?'，约 '+sdate(s.exhaust)+' 耗尽活动预算':''}。`
 }else if(risk.kind==='risk'){
  summary=`${cumulative}，但当前生效活动组合的近 3 日流速已高于剩余预算可支撑速度，需要降速。`
 }else if(risk.kind==='lift'){
  summary=`${cumulative}；当前仍可在近 3 日流速基础上提拉约 ${money(Math.max(0,m.support-m.r3),c,1)}/day。`
 }else{
  summary=`${cumulative}；当前近 3 日流速与剩余预算可支撑速度基本匹配。`
 }
 const next=up?`下一活动：<b>${sdate(up.start)} ${up.name}</b>，预算 ${money(bud(up),c,0)}，计划期日均约 ${money(bud(up)/days(up.start,up.end),c,0)}/day。`:'当前无待启动活动。';
 return `<div class="${detail?'country-detail-card':'country-card'}" ${detail?'':'data-jump="'+c+'"'}>
 <div class="c-head"><div><div class="c-title">${c} · ${co.fullName}</div><div class="c-meta">当前生效：${m.active}</div></div><span class="badge ${risk.kind}">${risk.label}</span></div>
 <div class="summary ${risk.kind==='risk'?'risk':''}">${summary}</div>
 <div class="metrics4">
  <div class="metric"><div class="lab">累计计划完成度</div><div class="val">${pct(m.completion)}</div><div class="note">实际累计 ÷ 截至当前应花</div></div>
  <div class="metric"><div class="lab">近 3 日日均流速</div><div class="val">${money(m.r3,c,0)}</div><div class="note">最近实际速度 / day</div></div>
  <div class="metric"><div class="lab">当前活动可支撑日均</div><div class="val">${money(m.support,c,0)}</div><div class="note">当前活动剩余预算 ÷ 剩余有效天</div></div>
  <div class="metric"><div class="lab">${risk.kind==='risk'?'需至少降速':m.support>=m.r3?'每天可提拉':'当前高于需求'}</div><div class="val">${money(Math.abs(m.support-m.r3),c,0)}</div><div class="note">${risk.kind==='risk'?'避免按当前流速继续超预算':'当前流速与可支撑流速差额'}</div></div>
 </div>
 <div class="flowbox"><div class="flow-title"><span>${m.active} · 当前活动余额</span><span>${money(m.remaining,c,0)}</span></div><div class="flow-grid"><div><span>近 3 日日均</span><b>${money(m.r3,c,1)}</b></div><div><span>后续可支撑日均</span><b>${money(m.support,c,1)}</b></div><div><span>累计实际花费</span><b>${money(m.act,c,0)}</b></div></div></div>
 <div class="next">${next}</div>${q3Html(c,m)}</div>`
}
function selectedStats(c){
 if(selectedActivity==='ALL'){const m=overall(c);return {mode:'整体',overall:m}}
 const i=state.countries[c].activities.findIndex(a=>a.name===selectedActivity);return {mode:selectedActivity,index:i,...activityStats(c,i)}
}
function render(){
 const vc=visibleCountries(),ga=maxS(vc.map(anchor));
 document.getElementById('subtitle').textContent=`数据截至 ${ga} · 日花费含 2% 税`;
 const src=state.meta?.lastImportName||state.sourceFile||'内置数据';
 document.getElementById('notice').textContent=selectedCountry==='ALL'?`共享数据源：${src}。`:`${selectedCountry} 国家页：活动切换会同步改变指标、折线图日期范围和今日判断。当前共享数据源：${src}`;
 document.querySelectorAll('#countrySeg button').forEach(b=>b.classList.toggle('on',b.dataset.country===selectedCountry));document.querySelectorAll('#curSeg button').forEach(b=>b.classList.toggle('on',b.dataset.cur===currency));
 if(selectedCountry==='ALL'){document.getElementById('overview').style.display='block';document.getElementById('countryPage').classList.remove('show');renderOverview()}
 else{document.getElementById('overview').style.display='none';document.getElementById('countryPage').classList.add('show');ensureActivity();renderCountryPage()}
}
function renderOverview(){const el=document.getElementById('overviewGrid');el.innerHTML=visibleCountries().map(c=>cardHtml(c,false)).join('');el.querySelectorAll('[data-jump]').forEach(x=>x.onclick=()=>{selectedCountry=x.dataset.jump;selectedActivity='ALL';render()})}
function ensureActivity(){const names=state.countries[selectedCountry].activities.map(a=>a.name);if(selectedActivity!=='ALL'&&!names.includes(selectedActivity))selectedActivity='ALL'}
function renderCountryPage(){document.getElementById('countryDetail').innerHTML=cardHtml(selectedCountry,true);renderActivitySeg();renderSnapshot();renderChart();renderJudge();renderTable()}
function renderActivitySeg(){
 const el=document.getElementById('activitySeg'),acts=state.countries[selectedCountry].activities;
 el.innerHTML=`<button data-a="ALL" class="${selectedActivity==='ALL'?'on':''}">整体</button>`+acts.map(a=>`<button data-a="${a.name}" class="${selectedActivity===a.name?'on':''}">${a.name}</button>`).join('');
 el.querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedActivity=b.dataset.a;renderCountryPage()})
}
function renderSnapshot(){
 const c=selectedCountry,s=selectedStats(c),el=document.getElementById('activitySnapshot');
 if(selectedActivity==='ALL'){
  const m=s.overall;
  el.innerHTML=`<div class="metrics6">
   <div class="metric"><div class="lab">整体累计计划完成度</div><div class="val">${pct(m.completion)}</div><div class="note">全部活动合并</div></div>
   <div class="metric"><div class="lab">近 3 日日均</div><div class="val">${money(m.r3,c,0)}</div><div class="note">国家实际流速</div></div>
   <div class="metric"><div class="lab">当前活动余额</div><div class="val">${money(m.remaining,c,0)}</div><div class="note">${m.active}</div></div>
   <div class="metric"><div class="lab">当前活动可支撑日均</div><div class="val">${money(m.support,c,0)}</div><div class="note">当前生效活动合计</div></div>
   <div class="metric"><div class="lab">流速差额</div><div class="val">${money(Math.abs(m.support-m.r3),c,0)}</div><div class="note">${m.r3>m.support?'当前高于可支撑速度':'当前仍有提拉空间'}</div></div>
   <div class="metric"><div class="lab">数据截止</div><div class="val">${sdate(m.dt)}</div><div class="note">最新完整数据日</div></div>
  </div>`
 }else{
  el.innerHTML=`<div class="metrics6">
   <div class="metric"><div class="lab">时间进度</div><div class="val">${pct(s.tp)}</div><div class="note">${sdate(s.a.start)} – ${sdate(s.a.end)}</div></div>
   <div class="metric"><div class="lab">花费进度</div><div class="val">${pct(s.sp)}</div><div class="note">实际花费 ÷ 活动预算</div></div>
   <div class="metric"><div class="lab">花费 / 时间</div><div class="val">${pct(s.pace)}</div><div class="note">100% = 与时间进度同步</div></div>
   <div class="metric"><div class="lab">近 3 日日均</div><div class="val">${money(s.recent,c,0)}</div><div class="note">该活动近 3 日分摊流速</div></div>
   <div class="metric"><div class="lab">后续可支撑日均</div><div class="val">${money(s.support,c,0)}</div><div class="note">剩余预算 ÷ 剩余有效天</div></div>
   <div class="metric"><div class="lab">预计期末花费</div><div class="val">${money(s.forecast,c,0)}</div><div class="note">${s.status==='生效中'?'按近 3 日流速不变':'仅生效中活动计算预测'}</div></div>
  </div>`
 }
}
function timeline(c){
 const co=state.countries[c],dt=anchor(c);let start,end,idx=null;
 if(selectedActivity==='ALL'){start=minS(co.activities.map(a=>a.start));end=maxS(co.activities.map(a=>a.end))}
 else{idx=co.activities.findIndex(a=>a.name===selectedActivity);start=co.activities[idx].start;end=co.activities[idx].end}
 const map=dailyAllocations(c),dates=[],plan=[],actual=[],forecast=[]; let aCum=0,pCum=0,guard=0;
 let recent=idx===null?null:recentActivityUSD(c,idx,3),forecastCum=null;
 for(let cur=start;cur<=end&&guard<400;cur=addDays(cur,1),guard++){
  let pd=0,ad=0;
  if(idx===null){pd=co.activities.reduce((s,a)=>s+planDay(a,cur),0);ad=co.daily.find(r=>r[0]===cur)?Number(co.daily.find(r=>r[0]===cur)[1]||0)*(1+Number(state.taxRate||0))/co.fx:0}
  else{pd=planDay(co.activities[idx],cur);ad=(map[cur]&&map[cur][idx])||0}
  pCum+=pd;if(cur<=dt)aCum+=ad;
  dates.push(cur);plan.push(pCum);actual.push(cur<=dt?aCum:null);
  if(idx!==null&&dt>=start&&dt<=end){
   if(cur<dt)forecast.push(null);
   else if(cur===dt){forecastCum=aCum;forecast.push(forecastCum)}
   else{forecastCum+=recent;forecast.push(forecastCum)}
  }else forecast.push(null)
 }
 return {dates,plan,actual,forecast,dt,start,end}
}
function renderChart(){
 const c=selectedCountry,t=timeline(c),wrap=document.getElementById('chartWrap'),label=selectedActivity==='ALL'?'整体':selectedActivity;
 document.getElementById('chartTitle').textContent=`${label} · 累计实际花费 vs 应花计划`;
 document.getElementById('chartSub').textContent=`显示范围 ${sdate(t.start)} – ${sdate(t.end)}；实际线截至 ${t.dt}${selectedActivity==='ALL'?'':'；橙色虚线按该活动近 3 日日均外推'}`;
 document.getElementById('forecastLegend').style.display=selectedActivity==='ALL'?'none':'flex';
 const W=900,H=320,pad={l:62,r:20,t:18,b:40},cv=v=>conv(v,c),plan=t.plan.map(cv),actual=t.actual.map(v=>v===null?null:cv(v)),forecast=t.forecast.map(v=>v===null?null:cv(v));
 const vals=plan.concat(actual.filter(v=>v!==null),forecast.filter(v=>v!==null));const maxY=Math.max(...vals,1)*1.08;
 const x=i=>pad.l+(W-pad.l-pad.r)*(i/Math.max(1,t.dates.length-1)),y=v=>H-pad.b-(H-pad.t-pad.b)*(v/maxY);
 let grid='',yl='';for(let i=0;i<=4;i++){const v=maxY*i/4,yy=y(v);grid+=`<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="#edf0f4"/>`;yl+=`<text x="${pad.l-9}" y="${yy+4}" text-anchor="end" font-size="10" fill="#7b8491">${Math.round(v).toLocaleString()}</text>`}
 const pp=plan.map((v,i)=>`${x(i)},${y(v)}`).join(' '),ap=actual.map((v,i)=>v===null?null:[x(i),y(v)]).filter(Boolean),fp=forecast.map((v,i)=>v===null?null:[x(i),y(v)]).filter(Boolean);
 const ticks=[0,Math.floor((t.dates.length-1)/4),Math.floor((t.dates.length-1)/2),Math.floor((t.dates.length-1)*3/4),t.dates.length-1],xt=[...new Set(ticks)].map(i=>`<text x="${x(i)}" y="${H-13}" text-anchor="middle" font-size="10" fill="#7b8491">${sdate(t.dates[i])}</text>`).join('');
 const ai=t.dates.indexOf(t.dt),ax=ai>=0?x(ai):null;
 wrap.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${yl}${ax!==null?`<line x1="${ax}" y1="${pad.t}" x2="${ax}" y2="${H-pad.b}" stroke="#c7ced9" stroke-dasharray="4 5"/><text x="${ax+5}" y="${pad.t+11}" font-size="9" fill="#7b8491">数据截止</text>`:''}<polyline points="${pp}" fill="none" stroke="#98a5bd" stroke-width="2.4"/><polyline points="${ap.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#3568d4" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${fp.length>1?`<polyline points="${fp.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#bd7929" stroke-width="2.6" stroke-dasharray="7 6" stroke-linecap="round"/>`:''}${ap.length?`<circle cx="${ap[ap.length-1][0]}" cy="${ap[ap.length-1][1]}" r="4" fill="#3568d4"/>`:''}${xt}</svg>`
}
function renderJudge(){
 const c=selectedCountry,s=selectedStats(c),el=document.getElementById('judge');
 if(selectedActivity==='ALL'){
  const risk=currentRisk(c),m=s.overall;
  if(risk.kind==='risk'&&risk.s){
   const x=risk.s;el.innerHTML=`<div class="judge-box risk"><div class="judge-title">⚠ 当前活动存在超支风险</div><div class="judge-body">虽然整体累计完成度只有 ${pct(m.completion)}，目前还没有超计划，但 ${x.a.name} 近 3 日流速 ${money(x.recent,c,1)}/day 已高于剩余预算可支撑的 ${money(x.support,c,1)}/day。若不降速，预计期末超预算 ${money(x.variance,c,0)}${x.cross?'，约 '+sdate(x.cross)+' 开始超过计划线':''}${x.exhaust?'，约 '+sdate(x.exhaust)+' 耗尽预算':''}。</div></div>
   <div class="judge-kpis"><div class="judge-mini"><span>近 3 日日均</span><b>${money(x.recent,c,1)}</b></div><div class="judge-mini"><span>可支撑日均</span><b>${money(x.support,c,1)}</b></div><div class="judge-mini"><span>预计期末</span><b>${money(x.forecast,c,0)}</b></div><div class="judge-mini"><span>预计超支</span><b>${money(x.variance,c,0)}</b></div></div>`
  }else{
   el.innerHTML=`<div class="judge-box ${risk.kind}"><div class="judge-title">${risk.kind==='lift'?'当前仍有提拉空间':'当前流速可控'}</div><div class="judge-body">整体累计计划完成度 ${pct(m.completion)}。当前近 3 日日均 ${money(m.r3,c,1)}/day，当前活动剩余预算可支撑约 ${money(m.support,c,1)}/day。</div></div>`
  }
  return
 }
 if(s.status==='待启动'){
  el.innerHTML=`<div class="judge-box"><div class="judge-title">${s.a.name} · 待启动</div><div class="judge-body">活动将在 ${sdate(s.a.start)} 开始。当前时间进度 0%，不参与超支判断。活动预算 ${money(s.budget,c,0)}，计划日均约 ${money(s.budget/days(s.a.start,s.a.end),c,0)}/day。</div></div>`
  return
 }
 const historical=s.sp>s.tp+0.0001?'目前已经超计划':s.sp<s.tp-0.0001?'目前仍低于计划':'目前与时间进度同步';
 if(s.variance>0){
  el.innerHTML=`<div class="judge-box risk"><div class="judge-title">⚠ ${s.a.name} · 未来超预算风险</div><div class="judge-body">${historical}：时间进度 ${pct(s.tp)}，花费进度 ${pct(s.sp)}。但近 3 日日均 ${money(s.recent,c,1)}/day 高于剩余预算可支撑的 ${money(s.support,c,1)}/day。若保持当前流速，预计期末花费 ${money(s.forecast,c,0)}，超预算约 ${money(s.variance,c,0)}${s.cross?'；橙色预测线预计 '+sdate(s.cross)+' 开始超过灰色计划线':''}${s.exhaust?'；约 '+sdate(s.exhaust)+' 耗尽预算':''}。</div></div>
  <div class="judge-kpis"><div class="judge-mini"><span>时间进度</span><b>${pct(s.tp)}</b></div><div class="judge-mini"><span>花费进度</span><b>${pct(s.sp)}</b></div><div class="judge-mini"><span>预计期末</span><b>${money(s.forecast,c,0)}</b></div><div class="judge-mini"><span>预计超支</span><b>${money(s.variance,c,0)}</b></div></div>`
 }else{
  const delta=s.support-s.recent;
  el.innerHTML=`<div class="judge-box ${delta>0?'lift':'ok'}"><div class="judge-title">${s.a.name} · ${historical}</div><div class="judge-body">时间进度 ${pct(s.tp)}，花费进度 ${pct(s.sp)}。近 3 日日均 ${money(s.recent,c,1)}/day，剩余预算可支撑 ${money(s.support,c,1)}/day。${delta>0?'当前仍可提拉约 '+money(delta,c,1)+'/day。':'当前流速基本匹配后续预算能力。'}</div></div>`
 }
}