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
    { key: "quartos", href: "/admin/quartos.html", label: "Acomodações" },
    { key: "precos", href: "/admin/precos.html", label: "Preços & disponibilidade" },
    { key: "fotos", href: "/admin/fotos.html", label: "Fotos da pousada" },
  ];

  el.innerHTML =
    `<img src="/assets/img/logo-white.png" alt="Villa Recanto do Mar" class="admin-sidebar-logo">` +
    links.map((l) => `<a href="${l.href}" class="${l.key === activeKey ? "active" : ""}">${l.label}</a>`).join("") +
    `<a href="#" id="logoutLink">Sair</a>`;

  document.getElementById("logoutLink").addEventListener("click", async (e) => {
    e.preventDefault();
    await villaSupabase.auth.signOut();
    location.href = "/admin/login.html";
  });
}

// Deixa os itens dentro de um container arrastáveis pra reordenar (usado nas
// listas de fotos do admin — quartos.html e fotos.html). Cada item precisa
// de draggable="true" e um atributo data-drag-id único (o índice ou o id do
// registro, tanto faz — só serve pra identificar cada item de volta).
//
// Os listeners ficam no container (não em cada item), então continuam
// funcionando mesmo depois de re-renderizar a lista inteira com innerHTML —
// só precisa chamar essa função uma vez, não a cada render.
//
// onReorder(newOrderIds) é chamado ao soltar um item, já com a nova ordem
// (array dos data-drag-id, na ordem visual final).
function enableDragReorder(containerEl, itemSelector, onReorder) {
  let dragEl = null;

  containerEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(itemSelector);
    if (!item || !containerEl.contains(item)) return;
    dragEl = item;
    item.classList.add("is-dragging");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  });

  containerEl.addEventListener("dragend", () => {
    if (dragEl) dragEl.classList.remove("is-dragging");
    dragEl = null;
  });

  containerEl.addEventListener("dragover", (e) => {
    if (!dragEl) return;
    e.preventDefault(); // necessário pra permitir o "drop"
    const target = e.target.closest(itemSelector);
    if (!target || target === dragEl || !containerEl.contains(target)) return;
    const items = Array.from(containerEl.querySelectorAll(itemSelector));
    const dragIsBefore = items.indexOf(dragEl) < items.indexOf(target);
    // Move o elemento arrastado pra antes/depois do alvo, dependendo de qual
    // lado ele veio — dá o feedback visual em tempo real, tipo Trello.
    if (dragIsBefore) target.after(dragEl);
    else target.before(dragEl);
  });

  containerEl.addEventListener("drop", (e) => {
    if (!dragEl) return;
    e.preventDefault();
    const newOrderIds = Array.from(containerEl.querySelectorAll(itemSelector)).map((el) => el.dataset.dragId);
    dragEl.classList.remove("is-dragging");
    dragEl = null;
    onReorder(newOrderIds);
  });
}
