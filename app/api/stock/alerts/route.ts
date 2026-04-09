import { NextResponse } from "next/server";
import { sendStockAlertWebhook } from "../../../../lib/server/sendStockAlertWebhook";

type AlertPayload = {
  itemName?: string;
  remainingQty?: number;
  alertThreshold?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlertPayload;
    const itemName = body.itemName?.trim() ?? "";
    const remainingQty = Number(body.remainingQty ?? 0);
    const alertThreshold = Number(body.alertThreshold ?? 0);

    if (!itemName || !Number.isFinite(remainingQty) || !Number.isFinite(alertThreshold)) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    if (remainingQty > alertThreshold) {
      return NextResponse.json({ triggered: false });
    }

    const result = await sendStockAlertWebhook(itemName, remainingQty);
    return NextResponse.json({ triggered: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur webhook inconnue." },
      { status: 500 },
    );
  }
}
