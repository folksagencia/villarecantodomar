// assets/session.js
//
// Gera/recupera um identificador aleatório por visitante, só para os
// gráficos do painel (visualizações por quarto, funil de abandono).
// Não é nome, e-mail nem nada que identifique a pessoa de verdade — é só
// uma forma de saber "quantas visitas diferentes chegaram até tal etapa".

function getVillaSessionId() {
  try {
    let id = localStorage.getItem("villa_session_id");
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
      localStorage.setItem("villa_session_id", id);
    }
    return id;
  } catch (e) {
    // Se o navegador bloquear localStorage (modo privado, etc.), segue sem quebrar.
    return "sem-local-storage";
  }
}

function logVillaEvent(payload) {
  try {
    const body = JSON.stringify(Object.assign({ session_id: getVillaSessionId() }, payload));
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/log-event", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/log-event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  } catch (e) {
    // Estatística nunca deve impedir o uso do site.
    console.warn("Não foi possível registrar evento:", e);
  }
}
