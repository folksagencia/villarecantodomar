// lib/email.js
//
// Envio de e-mail de aviso para a pousada via API do Resend
// (https://resend.com), usando só o `fetch` nativo do Node — mesmo espírito
// de lib/supabase-admin.js: ZERO dependências de npm.
//
// Configuração (Vercel -> Project Settings -> Environment Variables):
//   RESEND_API_KEY   - chave de API do Resend. Sem ela, o e-mail simplesmente
//                       não é enviado (só um aviso no log) — nunca quebra o
//                       fluxo do hóspede por causa disso.
//   NOTIFY_EMAIL     - e-mail que recebe os avisos. Padrão: agenciafolks1@gmail.com.
//   EMAIL_FROM       - remetente. Padrão: o domínio de testes do Resend
//                       (onboarding@resend.dev), que só consegue enviar para
//                       o próprio e-mail da conta Resend — funciona sem
//                       verificar domínio nenhum enquanto NOTIFY_EMAIL for
//                       esse mesmo e-mail. Pra enviar de um remetente com a
//                       cara da pousada (ex: aviso@villarecantodomar.com.br),
//                       verifique um domínio no Resend e configure essa
//                       variável.
//   SITE_URL         - usado só para montar o link "ver no painel" dentro do
//                       e-mail. Padrão: https://villarecantodomar.vercel.app

"use strict";

const DEFAULT_FROM = "Villa Recanto do Mar <onboarding@resend.dev>";
const DEFAULT_NOTIFY_EMAIL = "agenciafolks1@gmail.com";
const DEFAULT_SITE_URL = "https://villarecantodomar.vercel.app";

/**
 * Envia um e-mail de aviso. Nunca lança erro — sempre resolve com um objeto
 * descrevendo o que aconteceu, pra quem chamar decidir se quer logar algo
 * a mais, mas sem nunca derrubar a função serverless que chamou.
 */
async function sendNotificationEmail({ subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("sendNotificationEmail: RESEND_API_KEY não configurada — e-mail não foi enviado.");
    return { skipped: true };
  }

  const to = process.env.NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`sendNotificationEmail: Resend respondeu ${res.status} — ${text}`);
      return { ok: false, status: res.status, details: text };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendNotificationEmail: falha ao enviar e-mail:", err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}

function siteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

module.exports = { sendNotificationEmail, siteUrl };
