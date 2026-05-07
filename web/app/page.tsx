import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/sign-in-button";

const REPO_URL = "https://github.com/your-username/todoist-recurring-deadlines";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Todoist Recurring Deadlines</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            When you complete a recurring task in Todoist, the due date advances but the deadline stays put.
            This service watches for tasks tagged with the <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-sm dark:bg-zinc-800">recurring-deadline</code> label
            and bumps the deadline forward to match — so your countdown keeps working week after week.
          </p>
        </div>

        <div className="space-y-3">
          <SignInButton />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in with your Todoist account and we&rsquo;ll handle the rest. By default the service is enabled
            for new accounts; you can pause it from the dashboard at any time.
          </p>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Prefer to run it yourself? It&rsquo;s also a CLI/daemon you can self-host.{" "}
          <Link href={REPO_URL} className="underline underline-offset-4">
            View the repository
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
