import type { Task } from "@doist/todoist-api-typescript";

export interface SyncResponse {
  syncToken: string;
  fullSync?: boolean;
  items: Task[];
}

export class InvalidSyncTokenError extends Error {
  constructor(message = "Invalid or expired Todoist sync token") {
    super(message);
    this.name = "InvalidSyncTokenError";
  }
}

export async function syncItems(apiToken: string, syncToken: string): Promise<SyncResponse> {
  const body = new URLSearchParams({
    sync_token: syncToken,
    resource_types: JSON.stringify(["items"]),
  });

  const response = await fetch("https://api.todoist.com/api/v1/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const responseText = await response.text();
  const payload = parseJsonResponse(responseText) as {
    sync_token?: string;
    full_sync?: boolean;
    items?: Task[];
    error?: string;
    error_tag?: string;
    errorTag?: string;
  };

  if (!response.ok) {
    if (!payload) {
      throw new Error(`Todoist Sync API failed: ${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`);
    }

    const tag = payload.error_tag ?? payload.errorTag ?? payload.error;
    if (tag?.toLowerCase().includes("sync")) throw new InvalidSyncTokenError();
    throw new Error(`Todoist Sync API failed: ${payload.error ?? response.statusText}`);
  }

  if (!payload) {
    throw new Error(`Todoist Sync API returned invalid JSON: ${responseText.slice(0, 500)}`);
  }

  if (!payload.sync_token) throw new Error("Todoist Sync API response did not include sync_token");

  return {
    syncToken: payload.sync_token,
    fullSync: payload.full_sync,
    items: payload.items ?? [],
  };
}

function parseJsonResponse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
