# Todoist Recurring Deadlines

Repair Todoist deadlines for recurring tasks.

Todoist can advance a recurring due date when a task is completed, but deadlines do not currently recur with it. This tool polls Todoist and advances stale deadlines for opted-in recurring tasks.

V1 is CLI-only and self-hosted.

## Quick Start

```sh
bun install
bun run start setup
bun run start daemon
```

You can also run one poll cycle:

```sh
bun run start poll
```

## How It Works

Add the `recurring-deadline` label to any recurring task that has a deadline. When the task's deadline falls behind its current due date, this tool advances the deadline using the task's current recurrence.

Supported recurrence intervals in v1:

- daily
- weekly
- monthly
- yearly

Date-only tasks are supported. Tasks with due times or deadline times are ignored in v1.

## Commands

```sh
todoist-recurring-deadlines setup
todoist-recurring-deadlines poll
todoist-recurring-deadlines poll --full
todoist-recurring-deadlines daemon
todoist-recurring-deadlines reconcile
```

- `setup`: save and validate your Todoist API token, then create the `recurring-deadline` label if needed.
- `poll`: run one incremental sync cycle.
- `poll --full`: force a full Sync API scan and save the returned sync token.
- `daemon`: keep running and poll every 5 minutes.
- `reconcile`: run a full repair scan.

## Configuration

Local config and state are stored in:

```txt
.todoist-recurring-deadlines/
```

Add this directory to `.gitignore` because it can contain your Todoist API token.

You can also provide the token with an environment variable:

```sh
TODOIST_API_TOKEN=...
```

Environment variables override saved config.

## Docker

Build the image:

```sh
docker build -t todoist-recurring-deadlines .
```

Run with an environment token:

```sh
docker run \
  -e TODOIST_API_TOKEN=... \
  -v todoist-recurring-deadlines:/data \
  todoist-recurring-deadlines
```

The container defaults to `daemon` mode.

## VS Code / Cursor Debugging

This repo includes launch profiles in `.vscode/launch.json`.

Use the Run and Debug panel to start:

- `Debug CLI: poll`
- `Debug CLI: poll --full`
- `Debug CLI: reconcile`
- `Debug CLI: daemon`
- `Debug CLI: setup`
- `Debug Current Bun Test File`

You can also run tasks from the command palette:

- `bun: test`
- `bun: typecheck`
- `bun: poll`
- `bun: poll full`

## Design

See `docs/design-v1.md` for the v1 architecture and implementation decisions.
