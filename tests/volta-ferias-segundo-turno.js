const BASE=process.env.BASE||'http://localhost:8765';
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();
const T=(n,ok,x='')=>{console.log((ok?'OK   ':'FALHA')+' '+n+(x?' → '+x:''));if(!ok)process.exitCode=1};
const A=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.route('**/supabase.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/supabase-simulado.js','utf8')}));
await A.route('**/supabase-config.js*',r=>r.fulfill({contentType:'application/javascript',body:"window.SUPABASE_CONFIG={url:'http://x',anonKey:'y'}"}));
await A.goto(BASE+'/index.html');await A.waitForTimeout(500);
await A.fill('#loginEmail','a@a');await A.fill('#loginPass','ok');await A.click('#loginBtn');await A.waitForTimeout(1500);
const run=(regra)=>A.evaluate((regra)=>{state.baseMonday='2026-11-23';for(let i=0;i<4;i++){state.selectedWeek=i;setActive(10);const w=week();while(w.shifts.length>2)w.shifts.pop();w.employees.forEach(e=>{e.station='caixa';e.shift=0;e.restricted=false})}
 state.selectedWeek=0;const s=sector();if(regra)s.postShifts={caixa:[4,6]};else{delete s.postShifts;s.posts={caixa:{cedo:5,tarde:5,custom:true}}}
 roster().forEach(r=>delete r.aus);
 // a nº 1 de férias até a quarta da semana 2 → volta na semana 2; a nº 2 de férias a semana 1 inteira (volta no domingo da semana 2)
 roster()[0].aus=[{de:iso(date('domingo',0)),ate:iso(date('quarta',1)),tipo:'ferias'}];
 roster()[1].aus=[{de:iso(date('domingo',0)),ate:iso(date('sábado',0)),tipo:'atestado'}];
 applyPostPlan(true);render();
 const ws=sector().weeks,c=(wi)=>[0,1].map(t=>ws[wi].employees.filter(e=>e.shift===t&&!foraSemana(e,wi)).length);
 return {w2:[ws[1].employees[0].shift,ws[1].employees[1].shift],w3:[ws[2].employees[0].shift],cont:[0,1,2,3].map(c),ret:[0,1,2,3].map(wi=>retornaNaSemana(ws[wi],ws[wi].employees[0],wi))}},regra);
for(const regra of [true,false]){
 const r=await run(regra);const L=regra?' (regra 4/6)':' (cedo/tarde)';
 T('quem volta de férias entra no 2º turno na semana da volta'+L,r.w2[0]===1&&r.w2[1]===1,JSON.stringify(r));
 T('só a semana da volta é marcada'+L,JSON.stringify(r.ret)==='[false,true,false,false]',JSON.stringify(r.ret));
 if(regra) T('a quantidade por turno da regra continua igual'+L,JSON.stringify(r.cont.slice(1))==='[[4,6],[4,6],[4,6]]',JSON.stringify(r.cont));
}
// dá para mudar depois
const mud=await A.evaluate(()=>{state.selectedWeek=1;const e=week().employees[0];e.shift=0;render();return week().employees[0].shift});
T('dá para mudar o turno dela depois',mud===0);
T('sem erros de página',errs.length===0,errs.join(';'));
await b.close()})();
