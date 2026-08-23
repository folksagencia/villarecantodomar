// assets/format.js — helpers de formatação usados nas páginas.

function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function todayISODate() {
  // Usa a data LOCAL do navegador da pessoa (não UTC) — importante porque
  // usar toISOString() aqui causava, perto da meia-noite no fuso do Brasil
  // (UTC-3), a data "de hoje" pular para o dia seguinte mais cedo do que
  // devia, e em alguns navegadores de celular isso deixava datas passadas
  // clicáveis no seletor de check-in.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateTimeBR(isoTimestamp) {
  // Sempre mostra no horário de Brasília, independente do fuso de quem
  // está olhando o painel (ex: admin acessando de outro estado/país).
  if (!isoTimestamp) return "";
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const timePart = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}
