/* Supabase de mentira, em memória, usado só pelos testes automáticos (login, tabelas com regra "cada conta vê o seu", funções). */
try{window.__db=JSON.parse(sessionStorage.getItem('mdb')||'null')}catch(e){}window.__db=window.__db||{escalas:[],perfis:[{id:'u1',email:'a@a',papel:'admin'}]};window.__persist=()=>{try{sessionStorage.setItem('mdb',JSON.stringify(__db))}catch(e){}};window.__user=window.__user||'u1';window.__calls=[];window.__offline=false;window.__ver=window.__ver||1000;
window.supabase={createClient(){let cb=null,sess=null;try{sess=JSON.parse(sessionStorage.getItem('msess')||'null')}catch(e){}
 const q0=t=>{const q={op:'select',f:[],inn:null,row:null,sel:false,
  select(){q.sel=true;return q},insert(r){q.op='insert';q.row=r;return q},update(r){q.op='update';q.row=r;return q},
  eq(c,v){q.f.push([c,v]);return q},order(){return q},limit(){return q},in(c,v){q.inn=[c,v];return q},
  async maybeSingle(){const r=await q.run();return{data:(r.data||[])[0]||null,error:r.error}},
  then(res,rej){q.run().then(res,rej)},
  async run(){
   __calls.push(q.op+' '+t+' '+JSON.stringify(q.f));
   if(__offline)return{data:null,error:{message:'Failed to fetch'}};
   setTimeout(__persist,0);const T=__db[t]||(__db[t]=[]);const match=r=>q.f.every(([c,v])=>r[c]===v)&&(!q.inn||q.inn[1].includes(r[q.inn[0]]));
   const p=__db.perfis.find(x=>x.id===__user);
   const can=r=>p&&(p.papel==='admin'||r.dono===__user);const ver=can;
   if(q.op==='select'){let rows=T.filter(match);if(t==='escalas'||t==='escalas_historico')rows=rows.filter(r=>ver(r)).slice().reverse();if(t==='escalas')rows.reverse();return{data:rows.map(r=>({...r})),error:null}}
   if(q.op==='insert'){if(T.some(r=>r.setor===q.row.setor&&r.dono===q.row.dono))return{data:null,error:{code:'23505',message:'duplicate key'}};
     if(!can(q.row))return{data:null,error:{message:'new row violates row-level security policy'}};
     const r={...JSON.parse(JSON.stringify(q.row)),atualizado_em:'v'+(++__ver),atualizado_por:__user};T.push(r);return{data:[{...r}],error:null}}
   if(q.op==='update'){const rows=T.filter(match).filter(r=>can(r));rows.forEach(r=>{(__db.escalas_historico=__db.escalas_historico||[]).push({id:__db.escalas_historico.length+1,dono:r.dono,setor:r.setor,dados:JSON.parse(JSON.stringify(r.dados)),resumo:{colaboradoras:(r.dados.weeks&&r.dados.weeks[0].employees.length)||0,primeiros:[]},versao_em:'2026-11-14T10:00:00Z'});r.dados=JSON.parse(JSON.stringify(q.row.dados));r.atualizado_em='v'+(++__ver)});return{data:rows.map(r=>({...r})),error:null}}
  }};return q};
 return{auth:{async getSession(){if(/type=recovery/.test(location.hash)&&!sess)sess={user:{id:__user||'u1',email:'a@a'}};return{data:{session:sess}}},onAuthStateChange(f){cb=f;if(/type=recovery/.test(location.hash)){setTimeout(()=>{sess=sess||{user:{id:__user||'u1',email:'a@a'}};try{sessionStorage.setItem('msess',JSON.stringify(sess))}catch(e){}f('PASSWORD_RECOVERY',sess)},30)}return{}},async updateUser(o){__calls.push('updateUser '+o.password);if(o.password==='igual123')return{error:{message:'New password should be different from the old password.'}};return{data:{},error:null}},async signInWithPassword({email,password}){if(password!=='ok')return{error:{message:'Invalid login credentials'}};sess={user:{id:__user,email}};sessionStorage.setItem('msess',JSON.stringify(sess));cb('SIGNED_IN',sess);return{error:null}},async signOut(){sess=null;sessionStorage.removeItem('msess');cb('SIGNED_OUT',null)}},
 functions:{async invoke(n,{body}){__calls.push('fn '+body.acao);setTimeout(__persist,50);const P=__db.perfis,me=P.find(x=>x.id===__user);if(me.papel!=='admin')return{data:null,error:{message:'non-2xx',context:{json:async()=>({erro:'Só administradores podem fazer isso.'})}}};
  const bad=m=>({data:null,error:{message:'non-2xx',context:{json:async()=>({erro:m})}}});
  if(body.acao==='listar')return{data:{usuarios:P.map(x=>({id:x.id,email:x.email,nome:x.nome||'',papel:x.papel,setores_salvos:__db.escalas.filter(e=>e.dono===x.id&&e.setor!=='_config').length,ultima_edicao:null,ultimo_login:null,criado_em:'x',bloqueado:!!x.bloq}))},error:null};
  if(body.acao==='criar'){if(P.some(x=>x.email===body.email))return bad('Já existe um usuário com esse e-mail.');P.push({id:'n'+P.length,email:body.email,nome:body.nome,papel:body.papel});return{data:{ok:true},error:null}}
  if(body.acao==='backup')return{data:{sistema:'bom-dia-gestao-escalas',versao:1,gerado_em:'2026-11-14T10:00:00Z',perfis:P.map(x=>({id:x.id,email:x.email})),escalas:__db.escalas.map(e=>({dono:e.dono,dono_email:(P.find(x=>x.id===e.dono)||{}).email,setor:e.setor,dados:e.dados}))},error:null};
  if(body.acao==='restaurar_backup'){return{data:{ok:true,restauradas:body.backup.escalas.length,sem_conta:[]},error:null}}
  if(body.acao==='auditoria')return{data:{eventos:[{acao:'escala_salva',alvo:'padaria',ator_email:'a@a.com',quando:'2026-11-14T10:00:00Z',ultima_em:'2026-11-14T10:05:00Z',qtd:3,detalhes:{colaboradoras:8}},{acao:'usuario_criado',alvo:'x@x.com',ator_email:'a@a.com',quando:'2026-11-14T09:00:00Z',detalhes:{papel:'gerente'}}]},error:null};
  if(body.acao==='historico')return{data:{versoes:[{id:7,setor:body.setor,resumo:{colaboradoras:8,semanas:4,primeiros:['Ana','Bia']},versao_em:'2026-11-14T08:00:00Z',por:'a@a.com'}]},error:null};
  if(body.acao==='restaurar')return{data:{ok:true},error:null};
  if(body.acao==='lote'){let f=0;body.ids.forEach(i=>{const t=P.find(x=>x.id===i);if(!t)return;f++;if(body.op==='papel')t.papel=body.papel;if(body.op==='bloquear')t.bloq=true;if(body.op==='setores_add')t.setores=[...new Set([...(t.setores||[]),...body.setores])]});return{data:{ok:true,feitos:f,pulados:[]},error:null}}
  const u=P.find(x=>x.id===body.id);if(body.acao==='atualizar'){Object.assign(u,{nome:body.nome,papel:body.papel})}if(body.acao==='senha')u.senha=body.senha;if(body.acao==='bloquear')u.bloq=true;if(body.acao==='desbloquear')u.bloq=false;if(body.acao==='excluir')P.splice(P.indexOf(u),1);return{data:{ok:true},error:null}}},
 rpc(n,a){__calls.push('rpc '+n+' '+JSON.stringify(a));(__db.erros=__db.erros||[]).push(a);return Promise.resolve({data:null,error:null})},from:q0,channel(){const c={on(f,g,h){window.__rt=h;return c},subscribe(){return c}};return c},removeChannel(){}}}};
