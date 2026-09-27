---
layout: home

hero:
  name: Teldock
  text: Your files, stored on Telegram
  tagline: Self-hosted cloud storage that uses your own Telegram bot and private channel as the backend — chunked, optionally encrypted, and streamed.
  image:
    src: /logo.svg
    alt: Teldock
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/Chaerulcp/Teldock

features:
  - title: Chunked Uploads
    details: Large files are split into bounded parts of about 18 MB and streamed to your channel, removing the practical per-file size ceiling without buffering files on the server.
  - title: Streaming Downloads
    details: Parts are reassembled on the fly with backpressure handling and HTTP Range support, so downloads can be resumed and media can be seeked.
  - title: Multi-Bot Pool
    details: Register several bot tokens per account and distribute parts across them with round-robin selection for higher throughput and resilience against per-bot rate limits.
  - title: Version History
    details: Overwriting a file snapshots the previous contents automatically, and any earlier version can be listed and restored.
  - title: Secure Sharing
    details: Publish a file behind a signed public link with an optional expiry, a download limit, and password protection.
  - title: WebDAV Mount
    details: Mount Teldock as an ordinary drive on your desktop through the Rclone-compatible WebDAV endpoint, using your existing account credentials.
---

## Overview

Teldock turns a Telegram bot and a private channel into a personal cloud drive. Your server keeps
only metadata in a relational database and proxies file content to and from Telegram on demand, so
the raw bytes never persist on local disk. Each account connects its own bot and storage channel,
which keeps users isolated even when they share a single self-hosted instance.

## How it works

1. A user connects their own Telegram bot token and private storage channel in Settings.
2. On upload, the file is split into bounded parts of roughly 18 MB to stay within the Bot API limits.
3. Parts are streamed to that user's channel through their bot pool.
4. The database stores only metadata — filenames, part references, sizes, and encryption parameters.
5. On download, parts are reassembled in order and streamed back with `Range` support.

## Documentation

- [Installation](/guide/installation) — get a local instance running in a few minutes.
- [Using Teldock](/guide/usage) — upload, organize, preview, and share files.
- [API Reference](/reference/api) — every endpoint, with request and response examples.
- [Deployment](/guide/deployment) — put Teldock into production behind Nginx and HTTPS.

::: warning Read before you rely on it
Teldock is a non-commercial, open-source educational project. Using Telegram's Bot API as
general-purpose storage is not an intended use of the platform and may violate Telegram's
[Terms of Service](https://telegram.org/tos). Keep independent backups of anything important.
:::
