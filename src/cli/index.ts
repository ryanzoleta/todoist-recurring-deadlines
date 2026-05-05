#!/usr/bin/env bun
import { parseArgs } from "./args.ts";
import { runCommand } from "./commands.ts";

try {
  await runCommand(parseArgs(Bun.argv.slice(2)));
} catch (error) {
  console.error(error);
  process.exit(1);
}
