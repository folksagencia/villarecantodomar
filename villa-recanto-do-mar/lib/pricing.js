// lib/pricing.js
//
// Cálculo de preço de uma estadia. Este arquivo é "isomórfico": funciona
// tanto no navegador (carregado via <script src="/lib/pricing.js">, usa
// `window.VillaPricing`) quanto no servidor (Vercel Function, usa
// `module.exports`) — assim a mesma lógica de cálculo é usada nos dois
// lugares e nunca fica desalinhada.
//
// IMPORTANTE: o valor mostrado no navegador é só uma ESTIMATIVA para a
// pessoa ver antes de reservar. O valor que realmente vale (o que gera o
// Pix) é sempre recalculado no servidor, em api/create-reservation.js, a
// partir do banco de dados — o navegador nunca é uma fonte confiável de
// preço, porque alguém mal-intencionado poderia alterar o valor no console
// do navegador antes de enviar.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.VillaPricing = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Lista as datas (strings "YYYY-MM-DD") de check_in (incluso) até
   * check_out (exclusivo) — ou seja, as noites da estadia.
   */
  function listNights(checkIn, checkOut) {
    const nights = [];
    const current = new Date(checkIn + "T00:00:00Z");
    const end = new Date(checkOut + "T00:00:00Z");
    while (current < end) {
      nights.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return nights;
  }

  /**
   * Calcula o preço total de uma estadia.
   *
   * @param {Object} params
   * @param {string} params.checkIn - "YYYY-MM-DD"
   * @param {string} params.checkOut - "YYYY-MM-DD"
   * @param {number} params.basePrice - preço padrão por noite do quarto.
   * @param {Array<{date: string, price: number|null, is_blocked: boolean}>} params.overrides
   *   - lista de price_overrides do período (não precisa estar ordenada).
   * @param {number} [params.depositPercent=30]
   * @returns {{nights: number, nightly: Array<{date:string, price:number}>, totalPrice: number, depositAmount: number, blockedDates: string[]}}
   */
  function calculateStay({ checkIn, checkOut, basePrice, overrides, depositPercent }) {
    const pct = typeof depositPercent === "number" ? depositPercent : 30;
    const overridesByDate = {};
    (overrides || []).forEach((o) => {
      overridesByDate[o.date] = o;
    });

    const nightDates = listNights(checkIn, checkOut);
    const blockedDates = [];
    const nightly = nightDates.map((date) => {
      const override = overridesByDate[date];
      if (override && override.is_blocked) {
        blockedDates.push(date);
      }
      const price = override && override.price != null ? Number(override.price) : Number(basePrice);
      return { date, price };
    });

    const totalPrice = round2(nightly.reduce((sum, n) => sum + n.price, 0));
    const depositAmount = round2(totalPrice * (pct / 100));

    return {
      nights: nightDates.length,
      nightly,
      totalPrice,
      depositAmount,
      blockedDates,
    };
  }

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  return { calculateStay, listNights, round2 };
});
