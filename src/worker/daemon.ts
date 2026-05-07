import type { StateStore } from "../state/state-store";
import type { TodoistClient } from "../todoist/client";
import { runPoll, type PollOptions } from "./poller";

export interface DaemonOptions extends Omit<PollOptions, "forceFullSync"> {
  pollIntervalSeconds: number;
}

export async function runDaemon(
  store: StateStore,
  client: TodoistClient,
  options: DaemonOptions,
): Promise<never> {
  while (true) {
    try {
      const summary = await runPoll(store, client, options);
      console.log(`poll complete: scanned=${summary.scanned} updated=${summary.updated} skipped=${summary.skipped}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }

    await Bun.sleep(options.pollIntervalSeconds * 1000);
  }
}
