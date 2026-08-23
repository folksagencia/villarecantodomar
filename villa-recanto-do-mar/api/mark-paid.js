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
const { sendNotificationEmail, siteUrl } = require("../lib/email");

const UUID_RE = /^[0-9a-f-]{32,36}$/i;

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
}

function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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

    const rows = await pgSelect(
      "reservations",
      `id=eq.${encodeURIComponent(id)}` +
        `&select=id,status,room_id,guest_name,guest_phone,guest_email,check_in,check_out,nights,total_price,deposit_amount,rooms(name)`
    );
    const reservation = Array.isArray(rows) ? rows[0] : null;
    if (!reservation) {
      res.status(404).json({ error: "Reserva não encontrada." });
      return;
    }

    if (reservation.status === "aguardando_pix") {
      await pgUpdate("reservations", `id=eq.${encodeURIComponent(id)}`, {
        guest_marked_paid_at: new Date().toISOString(),
      });

      // Aviso por e-mail pra pousada saber, na hora, que precisa conferir o
      // Pix recebido e confirmar a reserva. Isso é só um "melhor esforço":
      // se o e-mail falhar (chave não configurada, Resend fora do ar etc.)
      // o aviso continua registrado no painel normalmente — não afeta o
      // hóspede.
      const roomName = (reservation.rooms && reservation.rooms.name) || "Acomodação";
      const html = `
        <div style="font-family:sans-serif;font-size:15px;color:#1f2a2e;line-height:1.5;">
          <h2 style="margin:0 0 12px;">Um hóspede avisou que pagou o Pix</h2>
          <p style="margin:0 0 16px;">Confira o extrato/Pix recebido e confirme a reserva no painel administrativo.</p>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">Hóspede</td><td><strong>${escapeHtml(reservation.guest_name)}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">WhatsApp</td><td>${escapeHtml(reservation.guest_phone || "-")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">E-mail</td><td>${escapeHtml(reservation.guest_email || "-")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">Acomodação</td><td>${escapeHtml(roomName)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">Datas</td><td>${formatDateBR(reservation.check_in)} a ${formatDateBR(reservation.check_out)} (${reservation.nights} noite(s))</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">Valor total</td><td>${formatBRL(reservation.total_price)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#52636a;">Sinal (Pix)</td><td><strong>${formatBRL(reservation.deposit_amount)}</strong></td></tr>
          </table>
          <p style="margin:20px 0 0;">
            <a href="${siteUrl()}/admin/reservas.html" style="color:#2e6285;">Abrir o painel de reservas &rarr;</a>
          </p>
        </div>
      `;
      // Espera o envio terminar (é rápido — uma chamada HTTP) antes de
      // responder ao hóspede, porque funções serverless podem ser
      // encerradas logo depois da resposta e um envio "solto" correria o
      // risco de nunca completar.
      try {
        await sendNotificationEmail({
          subject: `Pix avisado — ${reservation.guest_name} (${roomName})`,
          html,
        });
      } catch (err) {
        console.error("mark-paid: erro inesperado ao enviar e-mail:", err);
      }
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
