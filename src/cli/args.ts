export interface ParsedArgs {
  command?: string;
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) continue;

    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[rawName] = inlineValue;
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      flags[rawName] = next;
      index += 1;
    } else {
      flags[rawName] = true;
    }
  }

  return { command, flags };
}

export function stringFlag(flags: Record<string, string | boolean>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}
