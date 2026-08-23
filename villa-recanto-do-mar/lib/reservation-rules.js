// lib/reservation-rules.js
//
// Regra única do "prazo de validade" do Pix (2h), usada tanto em
// api/create-reservation.js (pra saber se uma data ainda está segurada por
// outra reserva) quanto em api/room-availability.js (pra calcular quais
// noites já estão lotadas). Ficar num lugar só evita a regra ficar
// desalinhada entre os dois arquivos.

"use strict";

const HOLD_MS = 2 * 60 * 60 * 1000; // 2 horas — mesmo prazo mostrado ao hóspede em reserva.html

/**
 * Diz se uma reserva ainda "conta" como ocupando a data (bloqueando/contando
 * pra lotação), na hora `nowMs`.
 *
 * - pix_confirmado / concluida: sempre conta.
 * - aguardando_pix: só conta se o hóspede já avisou que pagou (aí fica
 *   segurada até a pousada revisar manualmente), OU se ainda está dentro
 *   das 2h de validade do Pix. Depois disso, se ninguém confirmou nada, a
 *   data libera sozinha.
 */
function isConflicting(reservation, nowMs) {
  if (reservation.status !== "aguardando_pix") return true;
  if (reservation.guest_marked_paid_at) return true;
  return new Date(reservation.created_at).getTime() > nowMs - HOLD_MS;
}

module.exports = { isConflicting, HOLD_MS };
