---
title: Introduction
description: Teldock is a self-hosted cloud storage app that uses your own Telegram bot and private channel as its storage backend.
---

# Introduction

Teldock is an open-source, self-hosted cloud storage application that turns a **Telegram bot** and a **private channel** into a personal cloud drive. Files are split into bounded parts, optionally encrypted, and streamed to the user's own Telegram channel — so the server keeps almost no file data on disk while still offering a familiar web UI for browsing, sharing, and downloading.

The design is inspired by [teldrive](https://github.com/teldrive/teldrive), a pioneering implementation of Telegram-based file hosting.

## The core idea

Instead of storing bytes on a VPS, Teldock uses Telegram as the storage tier:

- Each user connects **their own bot token** and **their own private channel** through the Settings page.
- Uploaded files are split into parts and sent to that channel as Telegram documents.
- The database stores **only metadata** — filenames, part references, sizes, and encryption parameters — never raw file content.
- Downloads are reassembled from those parts on demand and streamed back to the browser.

## Why this design

| Goal | How Teldock achieves it |
| --- | --- |
| Minimal server storage | Only the database and an optional cache live on your disk. |
| Bandwidth offload | File transfer is handled by Telegram's infrastructure and CDN. |
| Per-user isolation | Each account stores content in its own channel with its own credentials. |
| Large-file support | Chunking removes the practical per-file size ceiling of the Bot API. |

## How it works

1. **Connect credentials** — a user registers an account, creates a bot with [@BotFather](https://t.me/BotFather), creates a private channel, and adds the bot as an admin. The bot token and channel ID are stored encrypted at rest.
2. **Upload and split** — on upload, the incoming stream is split into bounded parts of roughly 18 MB (`TG_PART_SIZE`), keeping peak memory usage to about one part rather than the whole file.
3. **Stream to Telegram** — each part is uploaded to the user's channel as a separate Telegram document, distributed across a multi-bot pool (round-robin) for higher throughput.
4. **Store metadata only** — MySQL/MariaDB records the file, its part references, sizes, checksums, and any encryption parameters. The file bytes are never written to server disk.
5. **Download and reassemble** — parts are fetched and stitched back together in order, with HTTP `Range` support so clients can seek, resume, and stream.

::: info Part size and limits
The default part size is `18874368` bytes (~18 MB), safely below the Telegram Bot API document limit. The maximum upload size is controlled by `MAX_UPLOAD_BYTES` (default 2 GB).
:::

## Who it is for

- **Self-hosters** who want a private cloud drive without paying for bulk object storage.
- **Homelab enthusiasts** who already run a VPS, MySQL, and want to experiment with Telegram-backed storage.
- **Families or small groups** sharing a single instance — each person connects their own bot and channel, so files stay isolated per account.

## Important disclaimer

::: warning Read before using
Teldock is a **non-commercial, open-source educational project**. Using the Telegram Bot API as general-purpose cloud storage is **not an intended use** of Telegram's platform and may violate Telegram's [Terms of Service](https://telegram.org/tos).

Only store data you own or have the right to store, avoid mass or commercial storage, and be aware that Telegram may rate-limit, suspend, or delete abusive accounts and files. Keep independent backups of anything important — **do not treat Teldock as reliable primary storage**. The authors are not liable for damages arising from its use.
:::

## Next steps

- [Installation](/guide/installation) — set up the backend and frontend.
- [Features](/guide/features) — the full feature set at a glance.
- [Architecture](/guide/architecture) — how the layers fit together.
