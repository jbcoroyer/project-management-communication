export async function sendStockAlertWebhook(itemName: string, remainingQty: number) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  // Configurez `SLACK_WEBHOOK_URL` dans `.env.local` avec l'URL entrante Slack
  // ou Microsoft Teams compatible webhook. Sans cette variable, l'alerte est ignorée.
  if (!webhookUrl) {
    return { sent: false, reason: "missing_webhook_url" as const };
  }

  const payload = {
    text: `⚠️ Alerte Stock : Il ne reste plus que ${remainingQty} ${itemName}. Pensez à recommander !`,
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook stock refusé (${response.status}).`);
  }

  return { sent: true as const };
}
