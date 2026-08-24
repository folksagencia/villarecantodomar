// assets/gallery.js — carrossel de fotos leve e reaproveitável (sem libs
// externas, sem depender de nada além do CSS em style.css).
//
// Uso:
//   renderGallery("meuContainerId", arrayDeFotos, { alt: "...", showCaption: true, autoplay: 4500 })
//
// `arrayDeFotos` aceita tanto uma lista de URLs simples (string) quanto uma
// lista de objetos { url, caption }.
//
// `opts.autoplay`: intervalo em ms pra passar de foto sozinho (ex: 4500).
// Se omitido, não passa sozinho. Pausa quando o dedo/mouse está em cima e
// respeita "reduzir movimento" do sistema operacional da pessoa.
//
// Como funciona a troca de foto: TODAS as fotos ficam lado a lado numa
// "tira" (.gallery-track / .card-carousel-track) dentro de uma janela que
// corta o excesso (overflow:hidden), e trocar de foto é só deslizar essa
// tira com uma transição de CSS (transform) — nunca troca o "src" de uma
// <img> já visível. Antigamente cada troca de foto reatribuía o src da
// mesma <img>, e como a foto nova ainda não tinha sido baixada, aparecia um
// piscar feio com o ícone de "imagem quebrada"/placeholder por uma fração de
// segundo antes da foto carregar. Deslizando uma tira pré-montada, a foto
// seguinte já está ali, pronta, então o efeito fica suave.
//
// Fotos na vertical (formato "story", mais alta que larga) não são
// cortadas: em vez de preencher o quadro cortando as bordas (object-fit:
// cover), elas aparecem inteiras dentro do quadro, com uma faixa da cor de
// fundo da marca nas laterais (object-fit: contain) — a mesma lógica do
// Instagram ao mostrar uma foto vertical num espaço mais largo.

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
      <div class="gallery-track" id="${containerId}-track">
        ${photos.map((p, i) => `
          <div class="gallery-slide">
            <img src="${escAttr(photoUrl(p))}" alt="${escAttr(opts.alt || "")}" loading="${i <= 1 ? "eager" : "lazy"}" decoding="async">
          </div>
        `).join("")}
      </div>
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

  const track = document.getElementById(`${containerId}-track`);
  track.querySelectorAll("img").forEach(markPortraitPhoto);

  const counter = document.getElementById(`${containerId}-counter`);
  const captionEl = document.getElementById(`${containerId}-caption`);
  const thumbsWrap = document.getElementById(`${containerId}-thumbs`);

  function show(i) {
    current = (i + photos.length) % photos.length;
    track.style.transform = `translateX(-${current * 100}%)`;
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

  // avançar sozinho (autoplay), com pausa quando a pessoa interage
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (opts.autoplay && photos.length > 1 && !prefersReducedMotion) {
    let timer = null;
    const start = () => {
      stop();
      timer = setInterval(() => show(current + 1), opts.autoplay);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    // só começa a rodar quando o carrossel está visível na tela — evita
    // gastar processamento/rede com carrosséis fora da vista.
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) start(); else stop(); });
      }, { threshold: 0.25 });
      io.observe(container);
    } else {
      start();
    }

    container.addEventListener("mouseenter", stop);
    container.addEventListener("mouseleave", start);
    container.addEventListener("touchstart", stop, { passive: true });
    container.addEventListener("focusin", stop);
    container.addEventListener("focusout", start);
  }
}

// renderCardCarousel: versão compacta do carrossel, pensada pra caber na
// foto de capa de um card pequeno (listagem da home) — setas discretas (só
// aparecem no hover) + bolinhas de posição (sem tira de miniaturas nem
// legenda, que não cabem num card). Mesma tira deslizante (sem trocar src)
// e mesmo suporte a foto vertical sem cortar, descritos lá em cima.
//
// Uso: renderCardCarousel("meuContainerId", arrayDeFotos, { alt: "...", autoplay: 4000 })
function renderCardCarousel(containerId, photos, opts) {
  opts = opts || {};
  const container = document.getElementById(containerId);
  if (!container) return;

  photos = (Array.isArray(photos) ? photos : []).filter(Boolean);
  if (photos.length === 0) {
    container.innerHTML = opts.emptyHtml || "";
    return;
  }

  let current = 0;

  container.innerHTML = `
    <div class="card-carousel-track" id="${containerId}-track">
      ${photos.map((url, i) => `
        <div class="card-carousel-slide">
          <img src="${escAttr(url)}" alt="${escAttr(opts.alt || "")}" loading="${i <= 1 ? "eager" : "lazy"}" decoding="async">
        </div>
      `).join("")}
    </div>
    ${photos.length > 1 ? `
      <button type="button" class="card-carousel-arrow card-carousel-prev" aria-label="Foto anterior">&#8249;</button>
      <button type="button" class="card-carousel-arrow card-carousel-next" aria-label="Próxima foto">&#8250;</button>
      <div class="card-carousel-dots">
        ${photos.map((_, i) => `<span class="card-carousel-dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("")}
      </div>
    ` : ""}
  `;

  const track = document.getElementById(`${containerId}-track`);
  track.querySelectorAll("img").forEach(markPortraitPhoto);
  const dots = container.querySelectorAll(".card-carousel-dot");

  function show(i) {
    current = (i + photos.length) % photos.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d) => d.classList.toggle("active", Number(d.dataset.i) === current));
  }

  if (photos.length > 1) {
    const prevBtn = container.querySelector(".card-carousel-prev");
    const nextBtn = container.querySelector(".card-carousel-next");
    // preventDefault/stopPropagation: o card inteiro é um link (<a>) —
    // sem isso, clicar na seta também navegaria pra página do quarto.
    prevBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); show(current - 1); });
    nextBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); show(current + 1); });
    dots.forEach((d) => {
      d.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); show(Number(d.dataset.i)); });
    });
  }

  // swipe no celular
  let touchStartX = null;
  container.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });

  // avançar sozinho, pausando no hover/toque — mesmo padrão do renderGallery
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (opts.autoplay && photos.length > 1 && !prefersReducedMotion) {
    let timer = null;
    const start = () => { stop(); timer = setInterval(() => show(current + 1), opts.autoplay); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    if (window.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) start(); else stop(); });
      }, { threshold: 0.25 });
      io.observe(container);
    } else {
      start();
    }

    container.addEventListener("mouseenter", stop);
    container.addEventListener("mouseleave", start);
    container.addEventListener("touchstart", stop, { passive: true });
  }
}

// Marca uma <img> como "retrato" (mais alta que larga — foto estilo story)
// assim que suas dimensões reais são conhecidas, pra o CSS trocar de
// object-fit:cover (corta pra preencher) pra object-fit:contain (mostra
// inteira, com uma faixa da cor de fundo nas laterais). Funciona tanto pra
// imagem já carregada do cache (img.complete) quanto pra uma que ainda vai
// carregar (evento "load").
function markPortraitPhoto(img) {
  if (!img) return;
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight && img.naturalHeight > img.naturalWidth) {
      img.classList.add("is-portrait");
    }
  };
  if (img.complete) apply();
  else img.addEventListener("load", apply, { once: true });
}

function escAttr(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escHtml(str) { return escAttr(str); }
