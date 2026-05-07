import { afterEach, describe, expect, test } from "bun:test";
import { syncItems } from "../../src/todoist/sync";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("syncItems", () => {
  test("calls the current Todoist Sync API endpoint", async () => {
    let requestedUrl = "";
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrl = url.toString();
      return Response.json({ sync_token: "next", items: [] });
    }) as unknown as typeof fetch;

    await syncItems("token", "*");

    expect(requestedUrl).toBe("https://api.todoist.com/api/v1/sync");
  });

  test("reports non-JSON Todoist responses without JSON parse crashes", async () => {
    globalThis.fetch = (async () => new Response("not json", { status: 404, statusText: "Not Found" })) as unknown as typeof fetch;

    await expect(syncItems("token", "*")).rejects.toThrow("Todoist Sync API failed: 404 Not Found: not json");
  });
});
