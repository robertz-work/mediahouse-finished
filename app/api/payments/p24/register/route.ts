import { NextResponse } from "next/server";
import * as paymentsRepo from "@/lib/db/paymentsRepo"; // dopasuj ścieżkę
import { registerTransaction } from "@/lib/p24"; // plik z poprzedniej wiadomości

export async function POST(req: Request) {
  try {
    const { campaignId, amount, email } = await req.json();

    if (!campaignId || !amount || !email) {
      return NextResponse.json({ error: "Brakujące dane (campaignId, amount, email)" }, { status: 400 });
    }

    // Generujemy unikalne ID sesji dla P24
    const sessionId = `CAMP_${campaignId}_${Date.now()}`;
    const amountInGrosze = Math.round(Number(amount) * 100);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 1. Zapisujemy płatność w bazie (jako pending)
    await paymentsRepo.create({
      campaignId,
      provider: "p24",
      amount: Number(amount), // upewnij się, że w bazie trzymasz format zgody z Twoim zamysłem (np. PLN)
      sessionId,
      currency: "PLN"
    });

    // 2. Rejestrujemy w P24
    const p24Response = await registerTransaction({
      sessionId,
      amount: amountInGrosze,
      description: `Opłata za kampanię #${campaignId}`,
      email,
      returnUrl: `${appUrl}/koszyk?status=success&campaignId=${campaignId}`,
      statusUrl: `${appUrl}/api/payments/p24/webhook`,
    });

    return NextResponse.json({ redirectUrl: p24Response.redirectUrl });
  } catch (error: any) {
    console.error("P24 Register Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}