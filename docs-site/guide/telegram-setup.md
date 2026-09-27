---
title: Connecting Telegram
description: Create a Telegram bot, prepare a private storage channel, and connect it to your Teldock account.
---

# Connecting Telegram

Teldock stores file data in Telegram. It is **multi-user**: every account connects its own bot token and its own private storage channel through the web UI, under **Settings → Telegram Integration**. Users do not share one bot, and credentials are never configured globally.

::: info .env Telegram values are for local development only
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_STORAGE_CHAT_ID` in `backend/.env` exist as a convenience for local development and testing. In real multi-user use, each account connects its own credentials in Settings. Those `.env` values are not a shared production fallback. See [Configuration](/guide/configuration).
:::

## 1. Create a bot with @BotFather

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts (choose a name and a username ending in `bot`).
3. Copy the **bot token** BotFather returns, for example `123456789:AAExampleTokenString`.
4. Keep the token private — anyone with it can control the bot.

## 2. Create a private channel

1. In Telegram, create a new **private channel** (choose "Private Channel" when asked for the type).
2. Give it a recognizable name; this channel is where your files will be stored.

## 3. Add the bot as a channel administrator

1. Open the channel, then **Manage Channel → Administrators → Add Admin**.
2. Search for your bot's username and add it.
3. Grant at least these permissions:
   - **Post Messages** — required to upload file parts.
   - **Delete Messages** — required to delete files and clean up parts.

::: warning The bot must be an administrator
If the bot is not an admin with Post and Delete permissions, uploads and deletes fail. A regular member cannot post to a channel.
:::

## 4. Get the channel chat ID

Channel chat IDs are **negative** and start with `-100`, for example `-1001234567890`. The `-100` prefix marks a supergroup or channel. A common mistake is using the channel username (`@my_channel`) or a positive ID — Teldock needs the numeric `-100...` form.

Ways to obtain it:

- **Forward a message to @userinfobot.** Post any message in your channel, forward it to [@userinfobot](https://t.me/userinfobot), and read the reported chat ID.
- **Use the Bot API `getUpdates`.** Post a message in the channel, then open this URL in a browser (replace the token):

  ```text
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
  ```

  Look for `"chat": { "id": -1001234567890, ... }` in the response. The channel must have received a message after the bot was added for an update to appear.

## 5. Enter the credentials in Teldock

1. Open `http://localhost:3000` and sign in.
2. Go to **Settings → Telegram Integration**.
3. Paste your **bot token** and the **channel chat ID**.
4. Save. Teldock validates the token against Telegram before accepting it.

## What happens on connect

- The bot token is **encrypted at rest** with `ENCRYPTION_KEY` before it is written to the database.
- The token is **never returned to the client** after it is stored — the UI shows only a masked/connected state.
- File parts are uploaded to the channel using the stored token; the channel ID identifies where parts live.

Because the token is encrypted with `ENCRYPTION_KEY`, that key must stay stable. Rotating it makes existing credentials unreadable. See [Configuration](/guide/configuration).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Uploads fail immediately | Bot is not a channel admin | Add the bot as an admin with **Post Messages** and **Delete Messages**. |
| "Chat not found" / bad ID | Wrong chat ID format | Use the negative `-100...` ID, not a username or positive number. |
| Token rejected on save | Token revoked or mistyped | Create a fresh token with @BotFather (`/token` or `/revoke`) and paste the full string. |
| Worked before, now fails | Token was revoked | Regenerate the token in @BotFather and reconnect in Settings. |

If you want to distribute uploads across several bots, see [Multi-Bot Pool](/guide/multibot).

## Next steps

- [Configuration](/guide/configuration) — backend and frontend settings walkthrough.
- [Multi-Bot Pool](/guide/multibot) — pool several bots to spread storage and rate limits.
