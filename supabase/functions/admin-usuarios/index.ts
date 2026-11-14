// Edge Function: administração de usuários (só administradores).
// Usa a chave de serviço (guardada no servidor do Supabase, nunca no app) para criar/editar/excluir usuários.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SETORES = ["frente-caixa", "acougue-frios", "loja-deposito", "padaria", "horti-fruit"];
const NIVEIS = ["admin", "gerente", "leitor"];
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

  const limpaSetores = (v: unknown) => Array.isArray(v) ? [...new Set(v.map(String))].filter((s) => SETORES.includes(s)) : [];
  const nivelOk = (n: unknown) => NIVEIS.includes(String(n));
  const totalAdmins = async () => {
    const { count } = await admin.from("perfis").select("id", { count: "exact", head: true }).eq("papel", "admin");
    return count || 0;
  };

  if (acao === "listar") {
    const { data: lista, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) return falha(error.message, 500);
    const { data: perfis } = await admin.from("perfis").select("*");
    const mapa = new Map((perfis || []).map((p: any) => [p.id, p]));
    const usuarios = lista.users.map((u: any) => {
      const p: any = mapa.get(u.id) || {};
      return {
        id: u.id, email: u.email, nome: p.nome || "", papel: p.papel || "leitor", setores: p.setores || [],
        ultimo_login: u.last_sign_in_at || null, criado_em: u.created_at,
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
      id: data.user.id, email, nome, papel: String(b.papel), setores: b.papel === "admin" ? [] : limpaSetores(b.setores),
    });
    if (eP) return falha(eP.message, 500);
    return json({ ok: true, id: data.user.id });
  }

  const id = String(b.id || "");
  if (!id) return falha("Usuário não informado.");

  if (acao === "atualizar") {
    if (!nivelOk(b.papel)) return falha("Nível de acesso inválido.");
    if (id === eu && b.papel !== "admin" && (await totalAdmins()) <= 1) return falha("Você é o único administrador. Torne outra pessoa administradora antes.");
    const { error } = await admin.from("perfis").update({
      nome: String(b.nome || "").trim(), papel: String(b.papel), setores: b.papel === "admin" ? [] : limpaSetores(b.setores),
    }).eq("id", id);
    if (error) return falha(error.message, 500);
    return json({ ok: true });
  }

  if (acao === "senha") {
    const senha = String(b.senha || "");
    if (senha.length < 6) return falha("A senha precisa ter pelo menos 6 caracteres.");
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
    if (error) return falha(error.message);
    return json({ ok: true });
  }

  if (acao === "bloquear" || acao === "desbloquear") {
    if (acao === "bloquear" && id === eu) return falha("Você não pode bloquear a si mesmo.");
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: acao === "bloquear" ? "876000h" : "none" });
    if (error) return falha(error.message);
    return json({ ok: true });
  }

  if (acao === "excluir") {
    if (id === eu) return falha("Você não pode excluir a si mesmo.");
    const { data: alvo } = await admin.from("perfis").select("papel").eq("id", id).maybeSingle();
    if (alvo?.papel === "admin" && (await totalAdmins()) <= 1) return falha("Não dá para excluir o único administrador.");
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return falha(error.message);
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
