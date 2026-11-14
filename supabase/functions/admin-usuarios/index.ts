// Edge Function: administração de usuários (só administradores).
// Usa a chave de serviço (guardada no servidor do Supabase, nunca no app) para criar/editar/excluir usuários.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SETORES = ["frente-caixa", "acougue-frios", "loja-deposito", "padaria", "horti-fruit"];
const NIVEIS = ["admin", "usuario"];
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const falha = (msg: string, status = 400) => json({ erro: msg }, status);

export async function tratar(req: Request, admin: any): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return falha("Método não permitido.", 405);

  // 1) quem está chamando?
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return falha("Faça login.", 401);
  const { data: quem, error: eAuth } = await admin.auth.getUser(token);
  if (eAuth || !quem?.user) return falha("Sessão inválida. Entre novamente.", 401);
  const eu = quem.user.id;
  const { data: meu } = await admin.from("perfis").select("papel").eq("id", eu).maybeSingle();
  if (!meu || meu.papel !== "admin") return falha("Só administradores podem fazer isso.", 403);

  let b: any;
  try { b = await req.json(); } catch { return falha("Pedido inválido."); }
  const acao = String(b.acao || "");

  const nivelOk = (n: unknown) => NIVEIS.includes(String(n));
  const totalAdmins = async () => {
    const { count } = await admin.from("perfis").select("id", { count: "exact", head: true }).eq("papel", "admin");
    return count || 0;
  };

  const emailEu: string = quem.user.email || "";
  const log = async (acaoLog: string, alvo: string | null, detalhes: unknown = null) => {
    await admin.from("auditoria").insert({ ator: eu, ator_email: emailEu, acao: acaoLog, alvo, detalhes });
  };
  const emailDe = async (id: string) => {
    const { data } = await admin.from("perfis").select("email").eq("id", id).maybeSingle();
    return data?.email || id;
  };

  if (acao === "auditoria") {
    let q = admin.from("auditoria").select("*").order("id", { ascending: false }).limit(Math.min(Number(b.limite) || 100, 500));
    if (b.filtro && typeof b.filtro === "string") q = q.like("acao", b.filtro + "%");
    const { data, error } = await q;
    if (error) return falha(error.message, 500);
    return json({ eventos: data });
  }

  if (acao === "historico") {
    const setor = String(b.setor || "");
    if (!SETORES.includes(setor)) return falha("Setor inválido.");
    const { data, error } = await admin.from("escalas_historico").select("id,setor,resumo,versao_em,versao_por,salvo_em")
      .eq("dono", String(b.dono || "")).eq("setor", setor).order("id", { ascending: false }).limit(30);
    if (error) return falha(error.message, 500);
    const ids = [...new Set((data || []).map((r: any) => r.versao_por).filter(Boolean))];
    const { data: ps } = ids.length ? await admin.from("perfis").select("id,email,nome").in("id", ids) : { data: [] };
    const nomes = new Map((ps || []).map((p: any) => [p.id, p.nome || p.email]));
    return json({ versoes: (data || []).map((r: any) => ({ ...r, por: nomes.get(r.versao_por) || null })) });
  }

  if (acao === "restaurar") {
    const { data: v } = await admin.from("escalas_historico").select("*").eq("id", Number(b.id)).maybeSingle();
    if (!v) return falha("Versão não encontrada.", 404);
    const { error } = await admin.from("escalas").update({ dados: v.dados }).eq("dono", v.dono).eq("setor", v.setor);
    if (error) return falha(error.message, 500);
    await log("escala_restaurada", v.setor, { versao_em: v.versao_em, resumo: v.resumo, dono: v.dono, dono_email: await emailDe(v.dono) });
    return json({ ok: true });
  }

  if (acao === "lote") {
    const ids: string[] = Array.isArray(b.ids) ? b.ids.map(String) : [];
    if (!ids.length) return falha("Nenhum usuário marcado.");
    const op = String(b.op || "");
    let feitos = 0; const pulados: string[] = [];
    for (const alvoId of ids) {
      const em = await emailDe(alvoId);
      if (op === "papel") {
        if (!nivelOk(b.papel)) return falha("Nível de acesso inválido.");
        if (alvoId === eu && b.papel !== "admin") { pulados.push(em + " (você mesmo)"); continue; }
        const { data: atual } = await admin.from("perfis").select("papel").eq("id", alvoId).maybeSingle();
        if (atual?.papel === "admin" && b.papel !== "admin" && (await totalAdmins()) <= 1) { pulados.push(em + " (único admin)"); continue; }
        await admin.from("perfis").update({ papel: String(b.papel) }).eq("id", alvoId);
        await log("usuario_nivel", em, { papel: b.papel });
      } else if (op === "bloquear" || op === "desbloquear") {
        if (op === "bloquear" && alvoId === eu) { pulados.push(em + " (você mesmo)"); continue; }
        const { error } = await admin.auth.admin.updateUserById(alvoId, { ban_duration: op === "bloquear" ? "876000h" : "none" });
        if (error) { pulados.push(em); continue; }
        await log("usuario_" + op, em);
      } else return falha("Operação desconhecida.");
      feitos++;
    }
    return json({ ok: true, feitos, pulados });
  }

  if (acao === "listar") {
    const { data: lista, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) return falha(error.message, 500);
    const { data: perfis } = await admin.from("perfis").select("*");
    const mapa = new Map((perfis || []).map((p: any) => [p.id, p]));
    const { data: esc } = await admin.from("escalas").select("dono,setor,atualizado_em").neq("setor", "_config");
    const dados = new Map<string, { n: number; ult: string | null }>();
    for (const e of esc || []) { const d = dados.get(e.dono) || { n: 0, ult: null }; d.n++; if (!d.ult || e.atualizado_em > d.ult) d.ult = e.atualizado_em; dados.set(e.dono, d); }
    const usuarios = lista.users.map((u: any) => {
      const p: any = mapa.get(u.id) || {};
      return {
        id: u.id, email: u.email, nome: p.nome || "", papel: p.papel || "usuario", setores_salvos: dados.get(u.id)?.n || 0, ultima_edicao: dados.get(u.id)?.ult || null,
        ultimo_login: u.last_sign_in_at || null, criado_em: u.created_at, confirmado: !!u.email_confirmed_at,
        bloqueado: !!(u.banned_until && new Date(u.banned_until) > new Date()),
      };
    }).sort((a: any, b: any) => (a.nome || a.email).localeCompare(b.nome || b.email));
    return json({ usuarios });
  }

  if (acao === "criar") {
    const email = String(b.email || "").trim().toLowerCase();
    const senha = String(b.senha || "");
    const nome = String(b.nome || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return falha("E-mail inválido.");
    if (senha.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
    if (!nivelOk(b.papel)) return falha("Nível de acesso inválido.");
    const { data, error } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { nome },
    });
    if (error) return falha(/already|registered|exists/i.test(error.message) ? "Já existe um usuário com esse e-mail." : error.message);
    const { error: eP } = await admin.from("perfis").upsert({
      id: data.user.id, email, nome, papel: String(b.papel),
    });
    if (eP) return falha(eP.message, 500);
    await log("usuario_criado", email, { papel: b.papel });
    return json({ ok: true, id: data.user.id });
  }

  const id = String(b.id || "");
  if (!id) return falha("Usuário não informado.");

  if (acao === "atualizar") {
    if (!nivelOk(b.papel)) return falha("Nível de acesso inválido.");
    if (id === eu && b.papel !== "admin" && (await totalAdmins()) <= 1) return falha("Você é o único administrador. Torne outra pessoa administradora antes.");
    const { error } = await admin.from("perfis").update({
      nome: String(b.nome || "").trim(), papel: String(b.papel),
    }).eq("id", id);
    if (error) return falha(error.message, 500);
    await log("usuario_editado", await emailDe(id), { papel: b.papel });
    return json({ ok: true });
  }

  if (acao === "senha") {
    const senha = String(b.senha || "");
    if (senha.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
    if (error) return falha(error.message);
    await log("usuario_senha", await emailDe(id));
    return json({ ok: true });
  }

  if (acao === "bloquear" || acao === "desbloquear") {
    if (acao === "bloquear" && id === eu) return falha("Você não pode bloquear a si mesmo.");
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: acao === "bloquear" ? "876000h" : "none" });
    if (error) return falha(error.message);
    await log("usuario_" + acao, await emailDe(id));
    return json({ ok: true });
  }

  if (acao === "excluir") {
    if (id === eu) return falha("Você não pode excluir a si mesmo.");
    const { data: alvo } = await admin.from("perfis").select("papel").eq("id", id).maybeSingle();
    if (alvo?.papel === "admin" && (await totalAdmins()) <= 1) return falha("Não dá para excluir o único administrador.");
    const emailAlvo = await emailDe(id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return falha(error.message);
    await log("usuario_excluido", emailAlvo);
    return json({ ok: true });
  }

  return falha("Ação desconhecida.");
}

if (typeof Deno !== "undefined" && (Deno as any).serve) {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  Deno.serve((req: Request) => tratar(req, admin).catch((e) => falha(String(e?.message || e), 500)));
}
