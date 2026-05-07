import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { repairEvents, serviceSettings, syncState } from "@/lib/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnabledToggle } from "@/components/enabled-toggle";
import { SignOutButton } from "@/components/sign-out-button";

const HOURS_24 = 24 * 60 * 60 * 1000;

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const ms = Date.now() - date.getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hr ago`;
  return `${Math.floor(ms / 86_400_000)} d ago`;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const userId = session.user.id;
  const dayAgo = new Date(Date.now() - HOURS_24);

  const [settings] = await db
    .select()
    .from(serviceSettings)
    .where(eq(serviceSettings.userId, userId))
    .limit(1);

  const [sync] = await db.select().from(syncState).where(eq(syncState.userId, userId)).limit(1);

  const [{ count: repaired24h } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairEvents)
    .where(and(eq(repairEvents.userId, userId), gte(repairEvents.createdAt, dayAgo)));

  const [{ count: repairedTotal } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairEvents)
    .where(eq(repairEvents.userId, userId));

  const enabled = settings?.enabled ?? true;
  const tokenRevoked = !!settings?.tokenRevokedAt;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Hi, {session.user.name}.</p>
        </div>
        <SignOutButton />
      </header>

      {tokenRevoked ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <CardHeader>
            <CardTitle>Reconnect your Todoist account</CardTitle>
            <CardDescription>
              We can&rsquo;t reach Todoist with the access token we have on file. Sign out and back in to reconnect.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${enabled && !tokenRevoked ? "bg-emerald-500" : "bg-zinc-400"}`}
                aria-hidden
              />
              {enabled && !tokenRevoked ? "Active" : "Paused"}
            </CardTitle>
            <CardDescription>
              When active, we check your tasks every few minutes and bump deadlines for tasks tagged{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">recurring-deadline</code>.
            </CardDescription>
          </div>
          <EnabledToggle initial={enabled} />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Last checked" value={timeAgo(sync?.lastSyncAt ?? null)} />
        <StatCard label="Repaired in last 24h" value={String(repaired24h)} />
        <StatCard label="Repaired total" value={String(repairedTotal)} />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
