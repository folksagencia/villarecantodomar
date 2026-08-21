// assets/admin-common.js — usado por todas as páginas de /admin/*.
//
// Duas funções:
//   requireAdminAuth() -> redireciona para o login se não houver sessão.
//   renderAdminNav(activeKey) -> desenha o menu lateral do painel.
//
// Lembrete de segurança: este redirecionamento é só uma conveniência de
// navegação (evita a pessoa ficar numa tela vazia). A proteção de verdade
// dos dados está nas políticas de RLS do banco (veja sql/schema.sql) — sem
// estar autenticado no Supabase, nenhuma leitura/escrita sensível funciona,
// mesmo que alguém tente pular esse redirecionamento.

async function requireAdminAuth() {
  const { data: { session } } = await villaSupabase.auth.getSession();
  if (!session) {
    location.href = "/admin/login.html";
    return null;
  }
  return session;
}

function renderAdminNav(activeKey) {
  const el = document.getElementById("adminNav");
  if (!el) return;

  const links = [
    { key: "dashboard", href: "/admin/index.html", label: "Painel" },
    { key: "reservas", href: "/admin/reservas.html", label: "Reservas" },
    { key: "quartos", href: "/admin/quartos.html", label: "Quartos" },
    { key: "precos", href: "/admin/precos.html", label: "Preços & disponibilidade" },
  ];

  el.innerHTML =
    links.map((l) => `<a href="${l.href}" class="${l.key === activeKey ? "active" : ""}">${l.label}</a>`).join("") +
    `<a href="#" id="logoutLink">Sair</a>`;

  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    await villaSupabase.auth.signOut();
    location.href = "/admin/login.html";
  });
}
