import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

export async function getAdminWebhookDeliveries(webhookId: string) {
  const response = await client.admin.webhooks[":webhookId"].deliveries.$get({
    param: { webhookId },
  });
  if (!response.ok) throw await HttpError.fromResponse(response);
  return response.json();
}
