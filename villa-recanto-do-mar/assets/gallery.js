// assets/gallery.js — carrossel de fotos leve e reaproveitável (sem libs
// externas, sem depender de nada além do CSS em style.css).
//
// Uso:
//   renderGallery("meuContainerId", arrayDeFotos, { alt: "...", showCaption: true })
//
// `arrayDeFotos` aceita tanto uma lista de URLs simples (string) quanto uma
// lista de objetos { url, caption }.
//
// Cuidado com performance: só a PRIMEIRA foto carrega imediatamente. As
// miniaturas usam loading="lazy" (o navegador só baixa quando estão perto de
// aparecer na tela) e a foto grande só troca de fato quando a pessoa clica —
// nada é pré-carregado escondido.

function renderGallery(containerId, photos, opts) {
  opts = opts || {};
  const container = document.getElementById(containerId);
  if (!container) return;

  photos = (Array.isArray(photos) ? photos : []).filter(Boolean);

  if (photos.length === 0) {
    container.innerHTML = opts.emptyHtml || "";
    return;
  }

  const photoUrl = (p) => (typeof p === "string" ? p : p.url);
  const photoCaption = (p) => (typeof p === "string" ? "" : p.caption || "");

  let current = 0;

  container.innerHTML = `
    <div class="gallery-main">
      <img id="${containerId}-mainImg" src="${escAttr(photoUrl(photos[0]))}" alt="${escAttr(opts.alt || "")}" loading="eager" decoding="async">
      ${photos.length > 1 ? `
        <button type="button" class="gallery-arrow gallery-prev" aria-label="Foto anterior">&#8249;</button>
        <button type="button" class="gallery-arrow gallery-next" aria-label="Próxima foto">&#8250;</button>
        <div class="gallery-counter"><span id="${containerId}-counter">1 / ${photos.length}</span></div>
      ` : ""}
      ${opts.showCaption ? `<div class="gallery-caption" id="${containerId}-caption">${escHtml(photoCaption(photos[0]))}</div>` : ""}
    </div>
    ${photos.length > 1 ? `
      <div class="gallery-thumbs" id="${containerId}-thumbs">
        ${photos.map((p, i) => `<img class="gallery-thumb${i === 0 ? " active" : ""}" data-i="${i}" src="${escAttr(photoUrl(p))}" alt="" loading="lazy" decoding="async">`).join("")}
      </div>
    ` : ""}
  `;

  const mainImg = document.getElementById(`${containerId}-mainImg`);
  const counter = document.getElementById(`${containerId}-counter`);
  const captionEl = document.getElementById(`${containerId}-caption`);
  const thumbsWrap = document.getElementById(`${containerId}-thumbs`);

  function show(i) {
    current = (i + photos.length) % photos.length;
    mainImg.src = photoUrl(photos[current]);
    if (counter) counter.textContent = `${current + 1} / ${photos.length}`;
    if (captionEl) captionEl.textContent = photoCaption(photos[current]);
    if (thumbsWrap) {
      thumbsWrap.querySelectorAll(".gallery-thumb").forEach((t) => t.classList.remove("active"));
      const activeThumb = thumbsWrap.querySelector(`[data-i="${current}"]`);
      if (activeThumb) {
        activeThumb.classList.add("active");
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }

  if (photos.length > 1) {
    container.querySelector(".gallery-prev").addEventListener("click", () => show(current - 1));
    container.querySelector(".gallery-next").addEventListener("click", () => show(current + 1));
  }
  if (thumbsWrap) {
    thumbsWrap.querySelectorAll(".gallery-thumb").forEach((t) => {
      t.addEventListener("click", () => show(Number(t.dataset.i)));
    });
  }

  // swipe no celular
  let touchStartX = null;
  const mainBox = container.querySelector(".gallery-main");
  mainBox.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  mainBox.addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
}

function escAttr(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escHtml(str) { return escAttr(str); }
