---
title: WebDAV & Rclone
description: Mount Teldock as an OS drive through the Rclone-compatible WebDAV endpoint using your Teldock email and password.
---

# WebDAV & Rclone

Teldock exposes a minimal WebDAV endpoint at `/webdav` so you can mount your storage as a
drive in your operating system, or sync it with [Rclone](https://rclone.org/) and other
WebDAV-compatible tools.

::: info
The endpoint is implemented for Rclone compatibility. It supports the core verbs needed for
listing, reading, writing, and organizing files, but it is not a full WebDAV server — see
[Limitations](#limitations) before relying on it for heavy sync.
:::

## Authentication

WebDAV uses **HTTP Basic authentication** with your Teldock account credentials:

- **Username:** the email address you registered with.
- **Password:** your Teldock account password.

Credentials are verified against the same bcrypt password hash used for web login. The bot
token is never involved in WebDAV auth. An unauthenticated request receives `401` with a
`WWW-Authenticate: Basic` challenge.

## Supported methods

| Method | Behavior |
| ------ | -------- |
| `OPTIONS` | Advertises capabilities: `DAV: 1, 2` and the allowed verbs |
| `PROPFIND` | Lists files and folders, honoring the `Depth` header |
| `GET` | Downloads a file, with HTTP `Range` support |
| `HEAD` | Returns size and content type without a body |
| `PUT` | Uploads a file (streamed, not buffered in memory) |
| `DELETE` | Deletes a file (soft delete) or a folder |
| `MKCOL` | Creates a folder |
| `MOVE` | Renames a file |

The `Allow` header returned by `OPTIONS` is:

```
OPTIONS, GET, HEAD, PUT, DELETE, PROPFIND, MKCOL, MOVE
```

## Rclone configuration

The simplest way to configure Rclone is the interactive wizard:

```bash
rclone config
```

Choose **n** for a new remote, name it (for example `teldock`), and select **WebDAV** as the
storage type. Then answer the prompts:

```ini
[teldock]
type = webdav
url = http://your-host:3001/webdav
vendor = other
user = you@example.com
pass = your-teldock-password
```

::: tip
`rclone config` obscures the password when it writes the config file. If you edit the file by
hand, run `rclone obscure 'your-password'` and paste the result into `pass`.
:::

Point `url` at the host and port where the backend listens (default `3001`), followed by
`/webdav`. Use `https://` and a reverse proxy in production — Basic auth sends credentials on
every request.

## Example commands

```bash
# List top-level folders
rclone lsd teldock:

# List everything recursively
rclone ls teldock:

# Upload a file to the root
rclone copy ./report.pdf teldock:

# Download a file
rclone copy teldock:report.pdf ./downloads/

# Mount as a drive (Linux/macOS, requires FUSE)
mkdir -p ~/teldock
rclone mount teldock: ~/teldock --daemon
```

On Windows, mount with WinFsp installed:

```powershell
rclone mount teldock: T: --vfs-cache-mode writes
```

## Limitations

These are behaviors you can verify in the WebDAV route implementation:

- **Rate limiting.** The `/webdav` router allows **5000 requests per 15 minutes** (configurable
  through `WEBDAV_RATE_LIMIT_MAX`), which is generous enough for mounted clients. Brute-force
  protection is applied separately: only **failed** authentication attempts are capped at 20 per
  15 minutes, so a correctly configured mount is never throttled. If your client still receives
  `429`, check that the credentials are correct and raise `WEBDAV_RATE_LIMIT_MAX`.
- **Content-type allowlist on upload.** `PUT` accepts only a fixed set of MIME types
  (`application/pdf`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`,
  `video/webm`, `audio/mpeg`, `audio/wav`, `text/plain`, `application/zip`,
  `application/gzip`). Any other type is rejected with `415 Unsupported file type`.
- **Upload size.** `PUT` is bounded by `MAX_UPLOAD_BYTES` (default 2 GB) and returns `413` if
  exceeded.
- **Uploads are not encrypted.** WebDAV writes are stored without per-file encryption, unlike
  uploads through the web UI.
- **Folders are addressed by name.** A path is resolved by the last segment's name, so two
  folders with the same name are ambiguous.
- **`MKCOL` only creates root-level folders.** Nested folder creation is not supported through
  WebDAV.
- **`MOVE` renames files only.** It reads the last segment of the `Destination` header and
  renames the file; it does not move files between folders or rename folders.
- **No `LOCK` or `COPY`.** WebDAV locking and server-side copy are not implemented, so some
  clients may fall back to download-and-upload.
- **Deletes are real.** `DELETE` on a file soft-deletes it and removes its Telegram messages;
  `DELETE` on a folder destroys the folder.

## Next steps

- [Multi-Bot Pool](/guide/multibot) — spread transfers across bots.
- [Troubleshooting & FAQ](/guide/troubleshooting) — WebDAV auth and connection issues.
- [API Reference](/reference/api) — the REST API alongside WebDAV.
