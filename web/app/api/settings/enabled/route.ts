import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { serviceSettings } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await request.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return new Response("Bad Request", { status: 400 });
  }

  await db
    .update(serviceSettings)
    .set({ enabled: body.enabled, updatedAt: new Date() })
    .where(eq(serviceSettings.userId, session.user.id));

  return Response.json({ enabled: body.enabled });
}
