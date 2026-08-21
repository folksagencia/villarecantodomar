// lib/pix.js
//
// Gerador de "Pix Copia e Cola" (BR Code / EMV QR) 100% offline.
//
// Não depende de nenhum gateway de pagamento, API paga ou serviço externo:
// é apenas a montagem de uma string no formato definido pelo Banco Central
// (Manual de Padrões para Iniciação do Pix) mais um checksum CRC16.
// Qualquer banco ou carteira digital que leia Pix consegue ler este código,
// porque o formato é público e padronizado — não existe "conta" nem "chave de API"
// nesse processo, apenas a sua própria chave Pix.
//
// Referência do formato: Banco Central do Brasil, "Manual de Padrões para
// Iniciação do Pix" (EMV QR Code Especificação, seção "Pix").

"use strict";

/**
 * Monta um campo TLV (Tag-Length-Value) no formato exigido pelo BR Code.
 * @param {string} id - identificador do campo, 2 dígitos (ex: "00", "26").
 * @param {string} value - conteúdo do campo.
 * @returns {string}
 */
function tlv(id, value) {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

/**
 * Remove acentos e caracteres fora do padrão ASCII básico exigido pelo
 * BR Code para nome do recebedor / cidade (evita QR inválido por causa de
 * "ã", "ç", etc).
 */
function normalize(text) {
  // NFD separa a letra da acentuação (ex: "ã" -> "a" + marca combinante);
  // como a marca combinante fica fora do intervalo ASCII imprimível,
  // o replace abaixo já remove a acentuação e qualquer outro caractere
  // que o BR Code não aceita, em um único passo.
  return text
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/**
 * Calcula o CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF,
 * sem reflexão) exigido pelo BR Code. Este é o mesmo algoritmo usado por
 * bancos e carteiras digitais para validar o QR Code do Pix.
 * @param {string} payload - payload SEM o campo final do CRC (mas incluindo "6304").
 * @returns {string} CRC de 4 dígitos hexadecimais maiúsculos.
 */
function crc16ccitt(payload) {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o payload "Pix Copia e Cola" completo.
 *
 * @param {Object} params
 * @param {string} params.pixKey - a chave Pix da pousada (CPF, CNPJ, e-mail, telefone ou chave aleatória).
 * @param {string} params.receiverName - nome do recebedor (máx. 25 caracteres após normalização).
 * @param {string} params.receiverCity - cidade do recebedor (máx. 15 caracteres após normalização).
 * @param {number} params.amount - valor em reais (ex: 450.30). Use ponto como separador decimal.
 * @param {string} [params.txid] - identificador da transação, até 25 caracteres alfanuméricos (sem acentos/espaços). Use "***" se não quiser identificar.
 * @param {string} [params.description] - mensagem opcional que aparece para quem paga.
 * @returns {string} payload pronto para virar QR Code ou ser copiado/colado.
 */
function buildPixPayload({ pixKey, receiverName, receiverCity, amount, txid, description }) {
  if (!pixKey) throw new Error("pixKey é obrigatório");
  if (!receiverName) throw new Error("receiverName é obrigatório");
  if (!receiverCity) throw new Error("receiverCity é obrigatório");
  if (typeof amount !== "number" || !(amount > 0)) {
    throw new Error("amount precisa ser um número maior que zero");
  }

  const cleanName = normalize(receiverName).slice(0, 25) || "PIX";
  const cleanCity = normalize(receiverCity).slice(0, 15) || "BRASIL";
  const cleanTxid = (txid ? normalize(txid).replace(/[^A-Za-z0-9]/g, "") : "").slice(0, 25) || "***";
  const amountStr = amount.toFixed(2);

  // Campo 26: Merchant Account Information (dados específicos do Pix)
  const merchantAccountInfo =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", pixKey) +
    (description ? tlv("02", normalize(description).slice(0, 40)) : "");

  // Campo 62: Additional Data Field (txid)
  const additionalData = tlv("05", cleanTxid);

  let payload =
    tlv("00", "01") + // Payload Format Indicator
    tlv("26", merchantAccountInfo) + // Merchant Account Information - Pix
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986") + // Transaction Currency (986 = BRL)
    tlv("54", amountStr) + // Transaction Amount
    tlv("58", "BR") + // Country Code
    tlv("59", cleanName) + // Merchant Name
    tlv("60", cleanCity) + // Merchant City
    tlv("62", additionalData) + // Additional Data Field
    "6304"; // início do campo do CRC (id 63, tamanho 04), valor vem a seguir

  const crc = crc16ccitt(payload);
  payload += crc;

  return payload;
}

module.exports = { buildPixPayload, crc16ccitt, tlv, normalize };
