---
title: Multi-Bot Pool
description: Add several Telegram bots to a Teldock account to spread uploads and downloads and improve throughput and resilience.
---

# Multi-Bot Pool

Teldock uploads and downloads files through Telegram bots. The Telegram Bot API applies
rate limits per bot, so a single bot becomes a bottleneck on large or concurrent transfers.
A **bot pool** lets you register several bot tokens on one account and spread the work across
them.

## Why use a pool

- **Higher throughput** — each part of a file is sent by the next bot in rotation, so the
  per-bot rate limit is shared across the pool.
- **Better resilience** — when a bot hits a retryable error, the next retry uses another bot
  from the pool, so one rate-limited or temporarily failing bot does not stall the transfer.
- **Practical target** — a handful of bots (the Settings UI suggests 5–8) is a good balance
  for most accounts.

::: info
The pool is per user. Bots you add are only used for your account and only ever write to your
own storage channel.
:::

## Adding bots in Settings

Open **Settings** and select the **Bot Pool** tab.

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its token.
2. Add the bot as an **admin** of your storage channel (the same channel you connected in
   Settings → Telegram Integration).
3. Paste the token into the Bot Pool field and click **Add Bot**.

Each token is validated before it is stored: the backend calls Telegram's `getMe` endpoint and
rejects the token if Telegram does not recognize it. A bot that is already in your pool is
also rejected with `This bot is already in your pool`. Validated tokens are encrypted at rest
and never returned to the client.

The pool list shows each bot's username, whether it is active, and when it was last used. Use
the remove button on a row to take a bot out of the pool.

::: warning
A bot that is not an admin of your channel will validate successfully (the token is real) but
uploads will fail when Telegram rejects the send. Add every pool bot to the channel.
:::

## How distribution works

Token selection is **round-robin per user**. For every part that needs to be uploaded or
downloaded, the service asks the pool for the next token, and an in-memory cursor advances so
consecutive parts use consecutive bots. With several bots and a chunked file, parts are spread
evenly across the pool.

The pool is resolved in priority order:

1. The user's active bots in the pool.
2. The bot token from the user's connected Telegram configuration, if the pool is empty.
3. In non-production environments only, the global `TELEGRAM_BOT_TOKEN` value as a
   development convenience.

If none of these exist, uploads fail with a message pointing you to Settings.

### What happens when a bot fails

Upload retries are handled per part. A failed attempt is retried up to 3 times, and each
retry picks the next token from the pool — so a failing bot is skipped on the next attempt
rather than being retried in isolation.

The delay between retries respects Telegram:

- If Telegram returns a `retry_after` value (typical of HTTP 429), that exact wait is used.
- Otherwise an exponential backoff is applied, starting at 1.5 seconds and doubling each
  attempt.

Errors are treated as retryable when there is no Telegram response at all (for example, a
network error), when the error code is `429`, or when it is `500` or greater. Non-retryable
errors such as a `400` stop the retry loop immediately and surface the failure. See
[Troubleshooting](/guide/troubleshooting) for handling sustained 429 responses.

## Storage note

All bots in a user's pool write to that user's channel. The storage channel is resolved from
the user's connected Telegram configuration, not from the bot, so adding bots does not change
where files are stored — it only changes which bot performs each operation. Because any bot in
the pool may be asked to read or delete a part, **every bot must be an admin of the channel**.

## API endpoints

The Bot Pool tab is a client of the `/api/bots` endpoints:

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| `GET` | `/api/bots` | Bearer | List the user's bot pool (no raw tokens) |
| `POST` | `/api/bots` | Bearer | Validate and add a bot token (`{ "token": "..." }`) |
| `DELETE` | `/api/bots/:id` | Bearer | Remove a bot from the pool |

## Next steps

- [WebDAV & Rclone](/guide/webdav) — mount the same storage as a drive.
- [Troubleshooting & FAQ](/guide/troubleshooting) — rate limits and upload failures.
- [API Reference](/reference/api) — request and response details.
