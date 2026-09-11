import crypto from "crypto";

const IS_SANDBOX = process.env.NEXT_PUBLIC_P24_SANDBOX === "true";
const P24_HOST = IS_SANDBOX
  ? "https://sandbox.przelewy24.pl"
  : "https://secure.przelewy24.pl";

const MERCHANT_ID = Number(process.env.P24_MERCHANT_ID);
const POS_ID = Number(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID);
const API_KEY = process.env.P24_API_KEY || "";
const CRC_KEY = process.env.P24_CRC_KEY || "";

function getAuthHeader() {
  const authStr = `${POS_ID}:${API_KEY}`;
  return `Basic ${Buffer.from(authStr).toString("base64")}`;
}

export function generateRegisterSign(sessionId: string, amount: number, currency = "PLN") {
  const payload = JSON.stringify({
    sessionId,
    merchantId: MERCHANT_ID,
    amount,
    currency,
    crc: CRC_KEY,
  });
  return crypto.createHash("sha384").update(payload).digest("hex");
}

export function generateVerifySign(sessionId: string, orderId: number, amount: number, currency = "PLN") {
  const payload = JSON.stringify({
    sessionId,
    orderId,
    amount,
    currency,
    crc: CRC_KEY,
  });
  return crypto.createHash("sha384").update(payload).digest("hex");
}

export function generateNotificationSign(data: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
}) {
  const payload = JSON.stringify({
    merchantId: data.merchantId,
    posId: data.posId,
    sessionId: data.sessionId,
    amount: data.amount,
    originAmount: data.originAmount,
    currency: data.currency,
    orderId: data.orderId,
    methodId: data.methodId,
    statement: data.statement,
    crc: CRC_KEY,
  });
  return crypto.createHash("sha384").update(payload).digest("hex");
}

export async function registerTransaction(params: {
  sessionId: string;
  amount: number; // w groszach np. 100.00 PLN = 10000
  description: string;
  email: string;
  returnUrl: string;
  statusUrl: string;
}) {
  const sign = generateRegisterSign(params.sessionId, params.amount);

  const body = {
    merchantId: MERCHANT_ID,
    posId: POS_ID,
    sessionId: params.sessionId,
    amount: params.amount,
    currency: "PLN",
    description: params.description,
    email: params.email,
    country: "PL",
    language: "pl",
    urlReturn: params.returnUrl,
    urlStatus: params.statusUrl,
    sign,
  };

  const res = await fetch(`${P24_HOST}/api/v1/transaction/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (res.ok && data.data?.token) {
    return {
      token: data.data.token as string,
      redirectUrl: `${P24_HOST}/trnRequest/${data.data.token}`,
    };
  }

  throw new Error(data.error || "Błąd podczas rejestracji transakcji w P24");
}

export async function verifyTransaction(params: {
  sessionId: string;
  orderId: number; // P24 orderId
  amount: number;
}) {
  const sign = generateVerifySign(params.sessionId, params.orderId, params.amount);

  const body = {
    merchantId: MERCHANT_ID,
    posId: POS_ID,
    sessionId: params.sessionId,
    amount: params.amount,
    currency: "PLN",
    orderId: params.orderId,
    sign,
  };

  const res = await fetch(`${P24_HOST}/api/v1/transaction/verify`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return res.ok && data.data?.status === "success";
}