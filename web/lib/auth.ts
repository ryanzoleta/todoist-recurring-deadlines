import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { db } from "./db/client";
import { serviceSettings } from "./db/schema";

interface TodoistUser {
  id: number;
  email: string;
  full_name: string;
}

async function fetchTodoistUser(accessToken: string): Promise<TodoistUser> {
  const res = await fetch("https://api.todoist.com/api/v1/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      sync_token: "*",
      resource_types: JSON.stringify(["user"]),
    }),
  });
  if (!res.ok) {
    throw new Error(`Todoist user fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { user?: TodoistUser };
  if (!json.user) throw new Error("Todoist sync response missing user");
  return json.user;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "todoist",
          clientId: process.env.TODOIST_CLIENT_ID ?? "",
          clientSecret: process.env.TODOIST_CLIENT_SECRET ?? "",
          authorizationUrl: "https://todoist.com/oauth/authorize",
          tokenUrl: "https://todoist.com/oauth/access_token",
          scopes: ["data:read_write"],
          getUserInfo: async (tokens) => {
            if (!tokens.accessToken) return null;
            const user = await fetchTodoistUser(tokens.accessToken);
            return {
              id: String(user.id),
              email: user.email,
              emailVerified: false,
              name: user.full_name,
            };
          },
        },
      ],
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          await db
            .insert(serviceSettings)
            .values({ userId: newUser.id })
            .onConflictDoNothing();
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
