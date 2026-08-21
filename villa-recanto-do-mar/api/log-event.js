// api/log-event.js
//
// Registra eventos simples para as estatísticas do painel admin:
//   - "view": alguém abriu a página de um quarto (para o contador de
//     visualizações por quarto).
//   - qualquer estágio do funil (viu_quarto, iniciou_reserva, gerou_pix):
//     para entender em que etapa as pessoas desistem antes de pagar o sinal.
//
// Não guarda nome, e-mail, IP nem nada identificável da pessoa — só um
// "session_id" aleatório gerado no navegador (veja assets/session.js), que
// nem sequer é ligado a uma identidade real.

"use strict";

const { pgInsert } = require("../lib/supabase-admin");

const VALID_STAGES = ["viu_quarto", "iniciou_reserva", "gerou_pix", "confirmou_envio_comprovante"];

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const sessionId = String(body.session_id || "sem-sessao").slice(0, 100);
    const roomId = body.room_id || null;

    if (body.type === "view" && roomId) {
      await pgInsert("room_views", [{ room_id: roomId, session_id: sessionId }]);
    }

    if (body.stage && VALID_STAGES.includes(body.stage)) {
      await pgInsert("funnel_events", [{ room_id: roomId, session_id: sessionId, stage: body.stage }]);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // Analytics nunca deve quebrar a experiência do site — só loga e retorna ok.
    console.error("log-event error:", err);
    res.status(200).json({ ok: false });
  }
};
