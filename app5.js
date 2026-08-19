/* Fix exact AE new-product attribution even when portfolio spend starts before the formal budget period. */
(function(){
 if(typeof PORTFOLIO_ACTIVITY_RULES==='undefined')return;

 function mappedActivityIndex(c,portfolioName){
  const activityName=mappedActivityName(c,portfolioName);
  if(!activityName)return -1;
  return state.countries[c].activities.findIndex(a=>a.name===activityName);
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
    const i=mappedActivityIndex(c,portfolio);
    if(i<0)continue;
    // Portfolio mapping is the source of truth for attribution. Do not discard
    // pre-launch/preheat spend just because the formal budget period starts later.
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

 recentActivityUSD=function(c,index,n=3){
  const map=dailyAllocations(c),a=state.countries[c].activities[index];
  const hasExactRule=Boolean((PORTFOLIO_ACTIVITY_RULES[c]||{})[a.name]);
  const dates=Object.keys(map)
   .filter(dt=>hasExactRule?((map[dt][index]||0)>0&&dt<=a.end):(dt>=a.start&&dt<=a.end))
   .sort().slice(-n);
  if(!dates.length)return 0;
  return dates.reduce((s,dt)=>s+(map[dt][index]||0),0)/dates.length
 };
})();
