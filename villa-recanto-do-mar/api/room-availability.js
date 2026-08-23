// api/room-availability.js
//
// Devolve, para um quarto e um intervalo de datas, quais NOITES já
// atingiram o limite de unidades daquele tipo de quarto (rooms.units) —
// ou seja, já não cabe mais ninguém ali naquela noite. Usado por
// quarto.html pra avisar a pessoa ANTES de ela preencher tudo e tentar
// reservar, e pra sugerir datas alternativas livres.
//
// É público (sem login) de propósito — mas só devolve datas cheias/livres,
// nunca nome, telefone, e-mail ou qualquer dado de hóspede. Por isso usa a
// chave de serviço só pra LER o mínimo necessário da tabela `reservations`
// (que não tem policy pública nenhuma) e devolve só um resumo agregado.

"use strict";

const { pgSelect } = require("../lib/supabase-admin");
const { listNights } = require("../lib/pricing");
const { isConflicting } = require("../lib/reservation-rules");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WINDOW_DAYS = 180;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const room_id = (req.query && req.query.room_id) || "";
    if (!room_id) {
      res.status(400).json({ error: "Quarto não informado." });
      return;
    }

    const today = todayISO();
    let from = (req.query && req.query.from) || today;
    let to = (req.query && req.query.to) || addDaysISO(today, MAX_WINDOW_DAYS);
    if (!DATE_RE.test(from)) from = today;
    if (!DATE_RE.test(to)) to = addDaysISO(today, MAX_WINDOW_DAYS);
    if (from < today) from = today; // não faz sentido calcular disponibilidade no passado
    if (to <= from) to = addDaysISO(from, 1);
    if (listNights(from, to).length > MAX_WINDOW_DAYS) to = addDaysISO(from, MAX_WINDOW_DAYS);

    const rooms = await pgSelect("rooms", `id=eq.${encodeURIComponent(room_id)}&select=id,units,active`);
    const room = Array.isArray(rooms) ? rooms[0] : null;
    if (!room || room.active !== true) {
      res.status(404).json({ error: "Quarto não encontrado ou indisponível." });
      return;
    }
    const units = Math.max(1, Number(room.units) || 1);

    const candidates = await pgSelect(
      "reservations",
      `room_id=eq.${encodeURIComponent(room_id)}` +
        `&status=in.(aguardando_pix,pix_confirmado,concluida)` +
        `&check_in=lt.${to}&check_out=gt.${from}` +
        `&select=status,created_at,guest_marked_paid_at,check_in,check_out`
    );

    const nowMs = Date.now();
    const active = (Array.isArray(candidates) ? candidates : []).filter((c) => isConflicting(c, nowMs));

    const nightCounts = {};
    active.forEach((c) => {
      listNights(c.check_in, c.check_out).forEach((d) => {
        if (d >= from && d < to) nightCounts[d] = (nightCounts[d] || 0) + 1;
      });
    });

    const fullyBookedDates = Object.keys(nightCounts)
      .filter((d) => nightCounts[d] >= units)
      .sort();

    res.status(200).json({ units, from, to, fullyBookedDates });
  } catch (err) {
    console.error("room-availability error:", err);
    res.status(500).json({ error: "Não foi possível checar a disponibilidade agora." });
  }
};
