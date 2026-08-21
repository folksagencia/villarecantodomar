// api/mark-paid.js
//
// Chamado quando o hóspede clica em "Já paguei o Pix / já mandei o
// comprovante" na página reserva.html. Isso NÃO confirma a reserva
// sozinho — só registra um aviso para a pousada ("notificação dentro da
// plataforma"). A confirmação de verdade é manual, feita pelo painel
// administrativo, depois de quem cuida da pousada checar o extrato/PIX
// recebido (ou o comprovante mandado por WhatsApp).

"use strict";

const { pgSelect, pgUpdate, pgInsert } = require("../lib/supabase-admin");

const UUID_RE = /^[0-9a-f-]{32,36}$/i;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const id = body.id || "";
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Reserva inválida." });
      return;
    }

    const rows = await pgSelect("reservations", `id=eq.${encodeURIComponent(id)}&select=id,status,room_id`);
    const reservation = Array.isArray(rows) ? rows[0] : null;
    if (!reservation) {
      res.status(404).json({ error: "Reserva não encontrada." });
      return;
    }

    if (reservation.status === "aguardando_pix") {
      await pgUpdate("reservations", `id=eq.${encodeURIComponent(id)}`, {
        guest_marked_paid_at: new Date().toISOString(),
      });
    }

    await pgInsert("funnel_events", [
      {
        session_id: (body.session_id || "sem-sessao").slice(0, 100),
        room_id: reservation.room_id,
        stage: "confirmou_envio_comprovante",
      },
    ]);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("mark-paid error:", err);
    res.status(500).json({ error: "Não foi possível registrar o aviso agora." });
  }
};
