// api/create-reservation.js
//
// Função serverless (roda na Vercel, Node.js). Recebe o pedido de reserva
// vindo de quarto.html, RECALCULA o preço a partir do banco de dados
// (nunca confia no valor que o navegador mandou), confere disponibilidade,
// grava a reserva e gera o Pix (QR + copia e cola) da própria pousada.
//
// Sem nenhuma dependência de npm: usa só Node.js puro + fetch nativo.

"use strict";

const crypto = require("crypto");
const { pgSelect, pgInsert, getEnv } = require("../lib/supabase-admin");
const { buildPixPayload } = require("../lib/pix");
const { calculateStay } = require("../lib/pricing");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { room_id, check_in, check_out, guest_name, guest_email, guest_phone } = body;

    // ---- validação básica dos dados enviados -----------------------------
    const errors = [];
    if (!room_id) errors.push("Quarto não informado.");
    if (!DATE_RE.test(check_in || "")) errors.push("Data de check-in inválida.");
    if (!DATE_RE.test(check_out || "")) errors.push("Data de check-out inválida.");
    if (check_in && check_out && check_out <= check_in) errors.push("Check-out precisa ser depois do check-in.");
    if (check_in && check_in < todayISO()) errors.push("Não é possível reservar uma data no passado.");
    if (!guest_name || guest_name.trim().length < 2) errors.push("Nome do hóspede é obrigatório.");
    if (!guest_email || !EMAIL_RE.test(guest_email)) errors.push("E-mail inválido.");
    if (!guest_phone || guest_phone.replace(/\D/g, "").length < 10) errors.push("Telefone/WhatsApp inválido.");

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(" ") });
      return;
    }

    // ---- busca o quarto (fonte da verdade do preço) -----------------------
    const rooms = await pgSelect(
      "rooms",
      `id=eq.${encodeURIComponent(room_id)}&select=id,name,base_price,active`
    );
    const room = Array.isArray(rooms) ? rooms[0] : null;
    if (!room || room.active !== true) {
      res.status(404).json({ error: "Quarto não encontrado ou indisponível." });
      return;
    }

    // ---- busca preços/bloqueios específicos do período --------------------
    const overrides = await pgSelect(
      "price_overrides",
      `room_id=eq.${encodeURIComponent(room_id)}&date=gte.${check_in}&date=lt.${check_out}&select=date,price,is_blocked`
    );

    const stay = calculateStay({
      checkIn: check_in,
      checkOut: check_out,
      basePrice: room.base_price,
      overrides,
      depositPercent: Number(process.env.DEPOSIT_PERCENT || 30),
    });

    if (stay.blockedDates.length > 0) {
      res.status(409).json({ error: "Uma ou mais datas escolhidas não estão mais disponíveis." });
      return;
    }

    // ---- confere se já não existe reserva conflitante ----------------------
    const conflicting = await pgSelect(
      "reservations",
      `room_id=eq.${encodeURIComponent(room_id)}` +
        `&status=in.(aguardando_pix,pix_confirmado,concluida)` +
        `&check_in=lt.${check_out}&check_out=gt.${check_in}&select=id`
    );
    if (Array.isArray(conflicting) && conflicting.length > 0) {
      res.status(409).json({ error: "Essas datas acabaram de ser reservadas por outra pessoa. Escolha outro período." });
      return;
    }

    // ---- gera o Pix (offline, com a chave da própria pousada) -------------
    const id = crypto.randomUUID();
    const txid = id.replace(/-/g, "").slice(0, 25);
    const pixPayload = buildPixPayload({
      pixKey: getEnv("PIX_KEY"),
      receiverName: getEnv("PIX_RECEIVER_NAME"),
      receiverCity: getEnv("PIX_RECEIVER_CITY"),
      amount: stay.depositAmount,
      txid,
      description: `Sinal reserva ${room.name}`.slice(0, 40),
    });

    // ---- grava a reserva -----------------------------------------------------
    const inserted = await pgInsert("reservations", [
      {
        id,
        room_id: room.id,
        guest_name: guest_name.trim(),
        guest_email: guest_email.trim(),
        guest_phone: guest_phone.trim(),
        check_in,
        check_out,
        nights: stay.nights,
        total_price: stay.totalPrice,
        deposit_percent: Number(process.env.DEPOSIT_PERCENT || 30),
        deposit_amount: stay.depositAmount,
        status: "aguardando_pix",
        pix_txid: txid,
        pix_payload: pixPayload,
      },
    ]);

    const reservation = Array.isArray(inserted) ? inserted[0] : inserted;

    res.status(200).json({
      id: reservation.id,
      roomName: room.name,
      checkIn: check_in,
      checkOut: check_out,
      nights: stay.nights,
      totalPrice: stay.totalPrice,
      depositAmount: stay.depositAmount,
      pixPayload,
    });
  } catch (err) {
    console.error("create-reservation error:", err);
    res.status(500).json({ error: "Não foi possível concluir a reserva agora. Tente novamente em instantes." });
  }
};
