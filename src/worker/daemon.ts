import type { AppConfig } from "../config/config.ts";
import type { TodoistClient } from "../todoist/client.ts";
import { runPoll } from "./poller.ts";

export async function runDaemon(config: AppConfig, client: TodoistClient): Promise<never> {
  while (true) {
    try {
      const summary = await runPoll(config, client);
      console.log(`poll complete: scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }

    await Bun.sleep(config.pollIntervalSeconds * 1000);
  }
}
