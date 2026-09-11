import * as paymentsRepo from "@/lib/db/paymentsRepo"; // dopasuj ścieżkę
import * as campaignsRepo from "@/lib/db/campaignsRepo"; // dopasuj ścieżkę
import { generateNotificationSign, verifyTransaction } from "@/lib/p24";
import { PaymentStatus } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      merchantId, posId, sessionId, amount, originAmount,
      currency, orderId, methodId, statement, sign,
    } = body;

    // 1. Walidacja podpisu SHA-384
    const calculatedSign = generateNotificationSign({
      merchantId, posId, sessionId, amount, originAmount,
      currency, orderId, methodId, statement,
    });

    if (calculatedSign !== sign) {
      return new Response("Invalid signature", { status: 400 });
    }

    // 2. Weryfikacja bezpośrednio w systemie P24
    const isVerified = await verifyTransaction({
      sessionId, orderId, amount,
    });

    if (isVerified) {
      // 3. Aktualizacja statusu w Twojej bazie
      const payment = await paymentsRepo.findBySessionId(sessionId);
      
      if (payment) {
        const paidAtIso = new Date().toISOString();
        
        await paymentsRepo.updateStatus(payment.id, "completed" as PaymentStatus, { 
          externalId: orderId.toString(),
          paidAt: paidAtIso
        });

        // Aktualizacja statusu kampanii powiązanej z płatnością
        await campaignsRepo.setStatus(payment.campaignId, "paid", {
          paidAt: paidAtIso
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("P24 Webhook Error:", error);
    return new Response("Webhook Error", { status: 500 });
  }
}