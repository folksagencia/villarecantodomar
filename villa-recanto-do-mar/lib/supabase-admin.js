// lib/supabase-admin.js
//
// Cliente mínimo, sem dependências (usa o `fetch` nativo do Node), para
// falar com a API REST do Supabase (PostgREST) usando a chave secreta
// ("service role" / "secret key"). Isso é usado SÓ dentro das funções em
// /api (rodam no servidor da Vercel) — essa chave nunca deve chegar ao
// navegador, por isso não existe nenhum arquivo em /assets que a use.
//
// Por que não usar o pacote @supabase/supabase-js aqui? Para manter o
// projeto com ZERO dependências de npm: menos coisa para instalar, menos
// superfície de coisas que podem quebrar, e a API REST do Supabase é
// simples o suficiente para conversar direto com `fetch`.

"use strict";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada. Confira o painel da Vercel (Project Settings -> Environment Variables).`
    );
  }
  return value;
}

function restUrl(path) {
  const base = getEnv("SUPABASE_URL").replace(/\/+$/, "");
  return `${base}/rest/v1/${path}`;
}

function adminHeaders(extra) {
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  return Object.assign(
    {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    extra || {}
  );
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
  }
  if (!res.ok) {
    const message = (data && data.message) || res.statusText || "Erro desconhecido do Supabase";
    const error = new Error(`Supabase (${res.status}): ${message}`);
    error.status = res.status;
    error.details = data;
    throw error;
  }
  return data;
}

/**
 * SELECT simples. `queryString` é o restante da query PostgREST, por ex:
 *   "select=id,name&active=eq.true&order=sort_order.asc"
 */
async function pgSelect(table, queryString) {
  const url = restUrl(`${table}${queryString ? "?" + queryString : ""}`);
  const res = await fetch(url, { headers: adminHeaders() });
  return parseResponse(res);
}

/**
 * INSERT de uma ou mais linhas. Retorna as linhas inseridas.
 */
async function pgInsert(table, rows) {
  const url = restUrl(table);
  const res = await fetch(url, {
    method: "POST",
    headers: adminHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  return parseResponse(res);
}

/**
 * UPDATE de linhas que casam com `queryString` (ex: "id=eq.<uuid>").
 */
async function pgUpdate(table, queryString, patch) {
  const url = restUrl(`${table}?${queryString}`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: adminHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  return parseResponse(res);
}

module.exports = { pgSelect, pgInsert, pgUpdate, getEnv };
