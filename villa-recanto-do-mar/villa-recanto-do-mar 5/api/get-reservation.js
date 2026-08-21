// api/get-reservation.js
//
// Devolve os dados de UMA reserva específica (para a página reserva.html
// conseguir reexibir o QR Code do Pix se a pessoa atualizar a página ou
// voltar depois). Só devolve o que é seguro mostrar publicamente para quem
// tem o link (o id é um UUID aleatório de 128 bits — impossível de
// adivinhar). Inclui nome/telefone/e-mail do hóspede APENAS para permitir
// pré-preencher uma nova reserva depois que o Pix expira (ninguém além de
// quem já tem esse link específico consegue chegar nesses dados).

"use strict";

const { pgSelect } = require("../lib/supabase-admin");

const UUID_RE = /^[0-9a-f-]{32,36}$/i;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const id = (req.query && req.query.id) || "";
    if (!UUID_RE.test(id)) {
      res.status(400).json({ error: "Reserva inválida." });
      return;
    }

    const rows = await pgSelect(
      "reservations",
      `id=eq.${encodeURIComponent(id)}&select=id,check_in,check_out,nights,total_price,deposit_amount,status,pix_payload,guest_marked_paid_at,created_at,guest_name,guest_phone,guest_email,rooms(name,slug)`
    );
    const reservation = Array.isArray(rows) ? rows[0] : null;

    if (!reservation) {
      res.status(404).json({ error: "Reserva não encontrada." });
      return;
    }

    res.status(200).json({
      id: reservation.id,
      roomName: reservation.rooms ? reservation.rooms.name : "",
      roomSlug: reservation.rooms ? reservation.rooms.slug : "",
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      nights: reservation.nights,
      totalPrice: reservation.total_price,
      depositAmount: reservation.deposit_amount,
      status: reservation.status,
      pixPayload: reservation.pix_payload,
      guestMarkedPaidAt: reservation.guest_marked_paid_at,
      createdAt: reservation.created_at,
      guestName: reservation.guest_name,
      guestPhone: reservation.guest_phone,
      guestEmail: reservation.guest_email,
    });
  } catch (err) {
    console.error("get-reservation error:", err);
    res.status(500).json({ error: "Não foi possível carregar a reserva agora." });
  }
};
