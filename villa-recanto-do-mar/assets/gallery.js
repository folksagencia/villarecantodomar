// assets/gallery.js — carrossel de fotos (e agora também vídeo vertical)
// leve e reaproveitável, sem libs externas, sem depender de nada além do
// CSS em style.css e de isVillaVideoUrl() (assets/format.js).
//
// Uso:
//   renderGallery("meuContainerId", arrayDeFotos, { alt: "...", showCaption: true, autoplay: 4500 })
//
// `arrayDeFotos` aceita tanto uma lista de URLs simples (string) quanto uma
// lista de objetos { url, caption }. Cada URL pode ser tanto de uma foto
// quanto de um vídeo (.mp4/.webm/.mov/.m4v) — o carrossel detecta sozinho
// pela extensão do arquivo e monta um <video> em vez de um <img> nesse
// slide. O vídeo toca sozinho, mudo e em loop (igual um story do
// Instagram/TikTok) — só o slide ATUALMENTE visível toca; os outros ficam
// pausados, e todos pausam se o carrossel sair da tela.
//
// `opts.autoplay`: intervalo em ms pra passar de foto sozinho (ex: 4500).
// Se omitido, não passa sozinho. Pausa quando o dedo/mouse está em cima e
// respeita "reduzir movimento" do sistema operacional da pessoa.
//
// Como funciona a troca de foto: TODAS as fotos/vídeos ficam lado a lado
// numa "tira" (.gallery-track / .card-carousel-track) dentro de uma janela
// que corta o excesso (overflow:hidden), e trocar de foto é só deslizar
// essa tira com uma transição de CSS (transform) — nunca troca o "src" de
// uma <img> já visível, então não tem aquele piscar feio de "recarregando a
// imagem". Cada <img>/<video> também nasce com opacity:0 e ganha a classe
// "is-loaded" (fade suave) assim que termina de carregar de verdade — em
// vez de "estourar" na tela de repente, o que reforça a sensação de
// carregamento, ela aparece suavemente.
//
// Só a PRIMEIRA foto de cada carrossel carrega imediatamente
// (loading="eager" + fetchpriority="high") — as demais usam loading="lazy"
// (o navegador só baixa quando estão perto de aparecer). Isso evita que
// várias fotos brigem por banda ao mesmo tempo no primeiro carregamento da
// página, o que na prática deixava a MAIS importante (a primeira) mais
// lenta de aparecer.
//
// Fotos na vertical (formato "story", mais alta que larga) não são
// cortadas nem sobram barras/bordas ao redor: o quadro do carrossel grande
// (renderGallery) se ajusta em altura pra caber a foto vertical inteira,
// exatamente do jeito que ela é (sem zoom, sem cortar) — só limitado por uma
// altura máxima de segurança (fotos extremamente altas) pra não estourar a
// página. Fotos horizontais continuam num quadro 16:9 padrão. Isso só se
// aplica ao carrossel grande — a capa compacta dos cards da listagem
// (renderCardCarousel) mantém um quadro fixo (como qualquer grade de fotos
// de listagem) e preenche cortando levemente quando preciso, pra manter
// todos os cards do mesmo tamanho.

const GALLERY_MAX_HEIGHT_RATIO = 0.72; // fração da altura da tela — teto de segurança pra fotos/vídeos verticais

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
    <div class="gallery-main" id="${containerId}-main">
      <div class="gallery-track" id="${containerId}-track">
        ${photos.map((p, i) => `
          <div class="gallery-slide">
            ${villaMediaTagHtml(photoUrl(p), { alt: opts.alt, eager: i === 0 })}
          </div>
        `).join("")}
      </div>
      ${photos.length > 1 ? `
        <button type="button" class="gallery-arrow gallery-prev" aria-label="Foto anterior">&#8249;</button>
        <button type="button" class="gallery-arrow gallery-next" aria-label="Próxima foto">&#8250;</button>
      ` : ""}
      ${opts.showCaption ? `<div class="gallery-caption" id="${containerId}-caption">${escHtml(photoCaption(photos[0]))}</div>` : ""}
    </div>
    ${photos.length > 1 ? `
      <div class="gallery-thumbs" id="${containerId}-thumbs">
        ${photos.map((p, i) => villaMediaThumbHtml(photoUrl(p), i)).join("")}
      </div>
    ` : ""}
  `;

  const mainEl = document.getElementById(`${containerId}-main`);
  const track = document.getElementById(`${containerId}-track`);
  const slideMedia = Array.from(track.querySelectorAll("img, video"));

  function syncMainHeight() {
    const h = computeSlideHeight(mainEl, slideMedia[current]);
    if (h) mainEl.style.height = `${h}px`;
  }

  function syncVideoPlayback() {
    slideMedia.forEach((el, i) => {
      if (el.tagName !== "VIDEO") return;
      if (i === current) el.play().catch(() => {});
      else el.pause();
    });
  }

  slideMedia.forEach((el, i) => {
    onMediaReady(el, () => {
      fadeIn(el);
      if (i === current) syncMainHeight();
    });
  });

  const captionEl = document.getElementById(`${containerId}-caption`);
  const thumbsWrap = document.getElementById(`${containerId}-thumbs`);

  function show(i) {
    current = (i + photos.length) % photos.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    syncMainHeight();
    syncVideoPlayback();
    if (captionEl) captionEl.textContent = photoCaption(photos[current]);
    if (thumbsWrap) {
      thumbsWrap.querySelectorAll(".gallery-thumb").forEach((t) => t.classList.remove("active"));
      const activeThumb = thumbsWrap.querySelector(`[data-i="${current}"]`);
      if (activeThumb) {
        activeThumb.classList.add("active");
        // Rola só a tira de miniaturas (scroll horizontal dela mesma) pra
        // centralizar a ativa — de propósito NÃO usa scrollIntoView aqui:
        // ele pode mexer no scroll vertical da PÁGINA inteira (em alguns
        // navegadores/posições), o que fazia a tela "pular" sozinha
        // enquanto a pessoa preenchia o formulário de reserva mais abaixo,
        // toda vez que o carrossel trocava de foto sozinho (autoplay).
        const target = activeThumb.offsetLeft - (thumbsWrap.clientWidth - activeThumb.offsetWidth) / 2;
        thumbsWrap.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
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

  // recalcula a altura ao redimensionar a janela (ex: virar o celular)
  window.addEventListener("resize", syncMainHeight);

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

  // pausa todo mundo quando o carrossel sai da tela, e retoma o vídeo do
  // slide atual quando volta — independe de ter autoplay de foto ligado.
  if (window.IntersectionObserver && slideMedia.some((el) => el.tagName === "VIDEO")) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) syncVideoPlayback();
        else slideMedia.forEach((el) => { if (el.tagName === "VIDEO") el.pause(); });
      });
    }, { threshold: 0.25 });
    vio.observe(container);
  }

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
// legenda, que não cabem num card). Mesma tira deslizante (sem trocar src),
// mesmo fade suave ao carregar e mesmo suporte a vídeo (muted/loop, só o
// slide visível toca) descritos lá em cima — mas aqui o quadro fica sempre
// do mesmo tamanho (a capa é uma grade de cards, então precisa de altura
// consistente entre eles), preenchendo/cortando levemente quando a foto não
// bate exatamente com a proporção do card.
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
          ${villaMediaTagHtml(url, { alt: opts.alt, eager: i === 0 })}
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
  const slideMedia = Array.from(track.querySelectorAll("img, video"));
  slideMedia.forEach((el) => onMediaReady(el, () => fadeIn(el)));
  const dots = container.querySelectorAll(".card-carousel-dot");

  function syncVideoPlayback() {
    slideMedia.forEach((el, i) => {
      if (el.tagName !== "VIDEO") return;
      if (i === current) el.play().catch(() => {});
      else el.pause();
    });
  }

  function show(i) {
    current = (i + photos.length) % photos.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d) => d.classList.toggle("active", Number(d.dataset.i) === current));
    syncVideoPlayback();
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

  // pausa todo mundo quando o card sai da tela, retoma o vídeo do slide
  // atual quando volta — independe de ter autoplay de foto ligado.
  if (window.IntersectionObserver && slideMedia.some((el) => el.tagName === "VIDEO")) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) syncVideoPlayback();
        else slideMedia.forEach((el) => { if (el.tagName === "VIDEO") el.pause(); });
      });
    }, { threshold: 0.25 });
    vio.observe(container);
  }

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

// Monta a tag certa (<img> ou <video>) pra uma URL de mídia de um slide
// principal — video toca sozinho, mudo, em loop (isVillaVideoUrl vem de
// assets/format.js, carregado antes deste arquivo em toda página que usa
// carrossel).
function villaMediaTagHtml(url, opts) {
  opts = opts || {};
  if (isVillaVideoUrl(url)) {
    return `<video src="${escAttr(url)}" muted autoplay loop playsinline preload="${opts.eager ? "auto" : "metadata"}" aria-label="${escAttr(opts.alt || "")}"></video>`;
  }
  return `<img src="${escAttr(url)}" alt="${escAttr(opts.alt || "")}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async"${opts.eager ? ' fetchpriority="high"' : ""}>`;
}

// Miniatura da tira de baixo (renderGallery) — mesma ideia, só que sempre
// carrega leve (preload="metadata") já que são várias de uma vez.
function villaMediaThumbHtml(url, i) {
  const activeClass = i === 0 ? " active" : "";
  if (isVillaVideoUrl(url)) {
    return `<video class="gallery-thumb${activeClass}" data-i="${i}" src="${escAttr(url)}" muted autoplay loop playsinline preload="metadata"></video>`;
  }
  return `<img class="gallery-thumb${activeClass}" data-i="${i}" src="${escAttr(url)}" alt="" loading="lazy" decoding="async">`;
}

// Roda `cb` assim que a <img>/<video> tiver suas dimensões reais
// disponíveis — já (se veio do cache/carregou rápido) ou quando o evento de
// "pronto" disparar (load pra imagem, loadedmetadata pra vídeo).
function onMediaReady(el, cb) {
  if (!el) return;
  if (el.tagName === "VIDEO") {
    if (el.readyState >= 1 && el.videoWidth) cb();
    else el.addEventListener("loadedmetadata", cb, { once: true });
  } else {
    if (el.complete && el.naturalWidth) cb();
    else el.addEventListener("load", cb, { once: true });
  }
}

function mediaWidth(el) { return el.tagName === "VIDEO" ? el.videoWidth : el.naturalWidth; }
function mediaHeight(el) { return el.tagName === "VIDEO" ? el.videoHeight : el.naturalHeight; }

// Fade-in suave em vez da foto/vídeo "estourar" de repente na tela assim
// que termina de carregar — dá a sensação de algo elegante acontecendo, não
// de "esperando carregar".
function fadeIn(el) {
  el.classList.add("is-loaded");
}

// Calcula a altura (em px) que o quadro do carrossel grande deve ter pra
// caber a foto/vídeo atual: 16:9 padrão pra conteúdo horizontal (preenche
// cortando um pouquinho, como é normal em qualquer galeria), ou a proporção
// exata do próprio conteúdo quando é vertical (retrato) — sem cortar e sem
// sobrar borda —, limitada por uma altura máxima de segurança.
function computeSlideHeight(mainEl, el) {
  const width = mainEl.clientWidth || mainEl.getBoundingClientRect().width;
  if (!width) return null;
  const w = el && mediaWidth(el);
  const h = el && mediaHeight(el);
  if (!w || !h) return width * 9 / 16;

  const isPortrait = h > w;
  if (!isPortrait) return width * 9 / 16;

  const exactHeight = width * (h / w);
  const maxHeight = window.innerHeight * GALLERY_MAX_HEIGHT_RATIO;
  return Math.min(exactHeight, maxHeight);
}

function escAttr(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escHtml(str) { return escAttr(str); }
