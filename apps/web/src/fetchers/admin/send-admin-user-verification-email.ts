import { client } from "@tracing/libs";
import { HttpError } from "@/lib/http-error";

export async function sendAdminUserVerificationEmail(userId: string) {
  const response = await client.admin.users[":userId"][
    "verification-email"
  ].$post({
    param: { userId },
  });

  if (!response.ok) {
    throw await HttpError.fromResponse(response);
  }

  return response.json();
}
