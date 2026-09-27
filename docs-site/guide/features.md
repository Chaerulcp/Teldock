---
title: Features
description: A grouped overview of Teldock's core functionality, user experience, and security and encryption features.
---

# Features

Teldock combines Telegram-backed storage with a modern web experience. The features below are grouped into three areas: the storage engine, the user-facing workflow, and the security layer.

## Core functionality

The storage engine is built around streaming and chunking. Files are split into bounded parts, uploaded across a multi-bot pool, and stitched back together on demand — which keeps memory usage low, supports large files, and allows resumable downloads.

| Feature | Description |
| --- | --- |
| Chunked uploads | Files are split into bounded parts (~18 MB) and uploaded across a multi-bot pool. |
| Streaming downloads | Parts are stitched back together with backpressure handling and resumable `Range` requests. |
| Multi-bot pool | Register multiple bot tokens per user for higher throughput via round-robin distribution. |
| Version history | Automatic version snapshots on overwrite, with the ability to revert to a prior version. |
| Soft delete | Deleted files are recoverable and storage-usage accounting is kept consistent. |

## User experience

Day-to-day use is handled through the web UI: organize files into folders, find them quickly with search, tags, favorites, and saved filters, preview images inline, share with public links, or mount the whole drive over WebDAV.

| Feature | Description |
| --- | --- |
| Folder structure | Hierarchical folders with path-based navigation. |
| Search and filter | Filename search, favorites, tags, and saved "smart folder" filters. |
| File preview | In-browser image previews in multiple sizes (WebP-optimized). |
| Sharing | Public links with optional expiration, download limits, and password protection. |
| WebDAV mount | Mount Teldock as an OS drive through the Rclone-compatible `/webdav` endpoint. |

## Security and encryption

Access to file bytes is always mediated by the API. Streams are authorized with short-lived signed URLs, credentials are encrypted at rest, and every request is validated and rate-limited at the boundary.

| Feature | Description |
| --- | --- |
| Signed file URLs | Short-lived, file-scoped signed URLs authorize preview and download streams. |
| AES-256-CTR encryption | Opt-in per-file encryption using a random salt and a per-part IV. |
| Encrypted credentials | Bot tokens are encrypted at rest and never returned to the client. |
| JWT authentication | Short-lived access tokens with refresh-token rotation. |
| Input validation | Request bodies are validated at the API boundary with schema validators (Zod). |
| Rate limiting | Global API limits plus stricter limits on the login endpoint. |

::: tip Encryption is per file
AES-256-CTR is opt-in and decided at upload time. Encrypted files can be downloaded normally, but inline preview is disabled for them — download the file instead.
:::

## Learn more

- [Architecture](/guide/architecture) — the layers behind these features.
- [Security](/guide/security) — the full threat model and hardening details.
- [Sharing Files](/guide/sharing) — how public links, expiry, and passwords work.
