// assets/amenities.js
//
// Catálogo fixo de comodidades das acomodações, com ícones no estilo visual
// da Villa (círculo azul + anel dourado + ícone de linha branco — a mesma
// linguagem usada nas capas de destaque do Instagram).
//
// Usado em dois lugares:
//   - admin/quartos.html: mostra os checkboxes agrupados por categoria pra
//     marcar o que tem em cada acomodação.
//   - quarto.html: renderiza os badges/seções na página pública da
//     acomodação, a partir do array `room.amenities` (chaves deste catálogo).
//
// Pra adicionar uma comodidade nova no futuro: só acrescentar um item aqui
// (com uma chave nova e um ícone SVG) — não precisa mexer em mais nada.

const VILLA_AMENITY_CATEGORIES = {
  geral: { label: "Comodidades", sectionTitle: "Comodidades:" },
  vista: { label: "Vista", sectionTitle: "Vista:" },
  banheiro: { label: "Banheiro", sectionTitle: "No seu banheiro privativo:" },
};

// Ícones em grade 24x24, traço branco (currentColor), pensados pra ficar
// pequenos dentro do círculo — poucos detalhes, linhas grossas.
const VILLA_AMENITY_ICONS = {
  varanda: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V9l8-5 8 5v12"/><path d="M4 21h16"/><path d="M7 21v-7M11 21v-7M15 21v-7M19 21v-7"/><path d="M4 14h16"/></svg>`,

  ar_condicionado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="6" rx="1.5"/><path d="M7 15.5c0 1.5-1 2-1 3.5M12 15.5c0 1.8-1.2 2.4-1.2 4.2M17 15.5c0 1.5-1 2-1 3.5"/></svg>`,

  banheiro_privativo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/><path d="M4 12V6.5A1.5 1.5 0 0 1 5.5 5c1 0 1.5.7 1.7 1.4"/><path d="M4 19v1.5M18 19v1.5"/></svg>`,

  tv_tela_plana: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M9 21h6M12 17v4"/></svg>`,

  wifi_gratuito: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5a13 13 0 0 1 17 0"/><path d="M6.7 13a8.5 8.5 0 0 1 10.6 0"/><path d="M10 16.5a4 4 0 0 1 4 0"/><circle cx="12" cy="19.3" r="0.9" fill="currentColor" stroke="none"/></svg>`,

  pet_friendly: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><ellipse cx="12" cy="16.2" rx="4.2" ry="3.4"/><ellipse cx="6.3" cy="10.3" rx="1.7" ry="2.2"/><ellipse cx="10.2" cy="7.2" rx="1.7" ry="2.2"/><ellipse cx="13.8" cy="7.2" rx="1.7" ry="2.2"/><ellipse cx="17.7" cy="10.3" rx="1.7" ry="2.2"/></svg>`,

  estacionamento_24h: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l1.4-4.6A2.2 2.2 0 0 1 7.5 9.8h9a2.2 2.2 0 0 1 2.1 1.6L20 16"/><rect x="2.5" y="16" width="19" height="3" rx="1.3"/><circle cx="7" cy="19.3" r="1.4"/><circle cx="17" cy="19.3" r="1.4"/></svg>`,

  roupa_de_cama: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M3 18h18v1.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V18Z"/><path d="M6 11V9a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/></svg>`,

  vista: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="8" cy="9.5" r="1.6"/><path d="M3 16.5l5-5 4 4 3-3 6 6"/></svg>`,

  produtos_banho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5h4v3l1.3 1.6c.5.6.7 1.3.7 2V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V9.1c0-.7.2-1.4.7-2L10 5.5v-3Z"/><path d="M8.5 13h7"/></svg>`,

  chuveiro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 11-3.4"/><circle cx="15.5" cy="8.5" r="3.3"/><path d="M8.5 14v1.6M12 14v1.6M15.5 14v1.6M8.5 18v1.6M12 18v1.6M15.5 18v1.6"/></svg>`,

  toalhas: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="4.5" rx="1"/><rect x="4" y="10" width="16" height="4.5" rx="1"/><path d="M4 18.5h16"/></svg>`,

  papel_higienico: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9.5" cy="12" rx="5.5" ry="6"/><ellipse cx="9.5" cy="12" rx="2.1" ry="2.3"/><path d="M15 8.5h3.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H14"/></svg>`,

  tamanho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`,

  area_comum: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="4.6" r="2"/><path d="M18 0.8v1M14.4 4.6h1M20.6 4.6h1M15.4 1.6l.9.9M21.3 1.6l-.9.9"/><rect x="2" y="8" width="15.5" height="11" rx="2"/><path d="M4.5 12.3c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 3 0"/><path d="M4.5 16c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 3 0"/></svg>`,

  espaco_kids: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16"/><path d="M6 4 3.5 20M18 4l2.5 16"/><path d="M9.7 4v7M14.3 4v7"/><path d="M9.7 11h4.6"/><circle cx="12" cy="8.6" r="1.5"/><path d="M10.3 11v3.3M13.7 11v3.3"/></svg>`,

  frigobar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.3" width="12" height="19.4" rx="1.5"/><path d="M15 7v6"/></svg>`,

  cafe_da_manha: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h10l-1 10a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 8Z"/><path d="M16 10h1.5a2.2 2.2 0 0 1 0 4.4H16"/><path d="M9 5.5c0-1 .7-1 .7-2M12 5.5c0-1 .7-1 .7-2"/></svg>`,

  bar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h9"/><path d="M6 7v3"/><path d="M15 7v3"/><path d="M6 10Q8.2 13.5 10.5 10Q12.8 13.5 15 10"/><path d="M6 10C6 14 7.5 17 10.5 17C13.5 17 15 14 15 10"/><path d="M10.5 17v3.3"/><path d="M8 21h5"/><path d="M2.5 1 10.8 10.3"/><path d="M15 7Q16.5 8.5 16.3 6.6"/><circle cx="18.2" cy="6.3" r="2.1"/></svg>`,
};

// Catálogo: chave -> { label, category, icon }
const VILLA_AMENITY_CATALOG = [
  { key: "varanda", label: "Varanda", category: "geral" },
  { key: "ar_condicionado", label: "Ar-condicionado", category: "geral" },
  { key: "banheiro_privativo", label: "Banheiro privativo", category: "geral" },
  { key: "tv_tela_plana", label: "TV de tela plana", category: "geral" },
  { key: "wifi_gratuito", label: "WiFi gratuito", category: "geral" },
  { key: "pet_friendly", label: "Pet friendly", category: "geral" },
  { key: "estacionamento_24h", label: "Estacionamento privativo 24h", category: "geral" },
  { key: "roupa_de_cama", label: "Roupa de cama", category: "geral" },
  { key: "frigobar", label: "Frigobar", category: "geral" },
  { key: "cafe_da_manha", label: "Café da manhã", category: "geral" },
  { key: "bar", label: "Bar", category: "geral" },
  { key: "area_comum", label: "Área comum com piscina, deck, churrasqueira e sinuca", category: "geral" },
  { key: "espaco_kids", label: "Espaço Kids", category: "geral" },
  { key: "vista", label: "Vista", category: "vista" },
  { key: "produtos_banho", label: "Produtos de banho grátis", category: "banheiro" },
  { key: "chuveiro", label: "Chuveiro", category: "banheiro" },
  { key: "toalhas", label: "Toalhas", category: "banheiro" },
  { key: "papel_higienico", label: "Papel higiênico", category: "banheiro" },
].map((item) => Object.assign({ icon: VILLA_AMENITY_ICONS[item.key] || "" }, item));

function villaAmenityByKey(key) {
  return VILLA_AMENITY_CATALOG.find((a) => a.key === key) || null;
}

// Ordem de prioridade pra escolher quais comodidades mostrar quando só cabe
// espaço pra poucas (ex: ícones sobre a foto de capa do card na home).
const VILLA_TOP_AMENITY_PRIORITY = [
  "wifi_gratuito", "ar_condicionado", "pet_friendly", "varanda", "area_comum",
  "estacionamento_24h", "banheiro_privativo", "tv_tela_plana", "espaco_kids", "vista", "roupa_de_cama",
];

function villaTopAmenities(room, limit) {
  const keys = Array.isArray(room.amenities) ? room.amenities : [];
  const set = new Set(keys);
  return VILLA_TOP_AMENITY_PRIORITY
    .filter((k) => set.has(k))
    .slice(0, limit || 4)
    .map(villaAmenityByKey)
    .filter(Boolean);
}

// --- Renderização (usada em quarto.html) ------------------------------------

// Ícone + texto lado a lado, numa linha só — compacto, com o ícone grande o
// bastante pra dar pra ver de verdade (o círculo grande de antes acabava
// deixando o desenho pequeno demais dentro dele e tomava espaço à toa).
function villaAmenityBadgeHtml(amenity) {
  return `
    <span class="amenity-item" title="${amenity.label.replace(/"/g, "&quot;")}">
      <span class="amenity-item-icon">${amenity.icon}</span>
      <span class="amenity-item-label">${amenity.label}</span>
    </span>
  `;
}

function villaRenderAmenitySection(title, keys) {
  if (!keys || keys.length === 0) return "";
  const items = keys.map(villaAmenityByKey).filter(Boolean);
  if (items.length === 0) return "";
  return `
    <div class="amenity-section">
      <h4 class="amenity-section-title">${title}</h4>
      <div class="amenity-grid">
        ${items.map((a) => villaAmenityBadgeHtml(a)).join("")}
      </div>
    </div>
  `;
}

// Recebe room.amenities (array de chaves) + room.size_m2 e devolve o HTML
// completo do bloco de comodidades da página do quarto (topo + seções).
function villaRenderRoomAmenities(room) {
  const keys = Array.isArray(room.amenities) ? room.amenities : [];
  const geralKeys = keys.filter((k) => { const a = villaAmenityByKey(k); return a && a.category === "geral"; });
  const vistaKeys = keys.filter((k) => { const a = villaAmenityByKey(k); return a && a.category === "vista"; });
  const banheiroKeys = keys.filter((k) => { const a = villaAmenityByKey(k); return a && a.category === "banheiro"; });

  const bedLine = room.bed_config
    ? `<p class="amenity-bed-config">${String(room.bed_config).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))}</p>`
    : "";

  const sections = [
    villaRenderAmenitySection(VILLA_AMENITY_CATEGORIES.banheiro.sectionTitle, banheiroKeys),
    villaRenderAmenitySection(VILLA_AMENITY_CATEGORIES.vista.sectionTitle, vistaKeys),
    villaRenderAmenitySection(VILLA_AMENITY_CATEGORIES.geral.sectionTitle, geralKeys),
  ].join("");

  if (!bedLine && !sections) return "";

  return `
    <div class="amenity-block">
      ${bedLine}
      ${sections}
    </div>
  `;
}
