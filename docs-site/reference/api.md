---
title: API Reference
description: Complete reference for the Teldock REST API, including endpoints, payloads, and rate limits.
---

# API Reference

The Teldock API is a REST service served by the Node.js backend. All routes below are mounted under
the `/api` prefix except the WebDAV endpoint, which is mounted at `/webdav`.

## Base URL and conventions

```text
http://localhost:3001/api
```

In production, the frontend and API are served from the same origin behind Nginx, so the base URL is
`https://yourdomain.com/api`.

### Response envelope

Successful responses wrap their payload in `data`:

```json
{
  "success": true,
  "data": { }
}
```

Errors use `success: false` with a human-readable `error` string:

```json
{
  "success": false,
  "error": "File not found"
}
```

### Authentication

Protected endpoints require a bearer access token:

```http
Authorization: Bearer <access-token>
```

Obtain a token from `POST /auth/register` or `POST /auth/login`, and renew it with
`POST /auth/refresh`.

### Error status codes

| Status | Meaning |
| --- | --- |
| `400` | Validation failed or a required field is missing. |
| `401` | No access token supplied, or invalid credentials. |
| `403` | Token invalid/expired, or the caller does not own the resource. |
| `404` | The requested resource does not exist. |
| `409` | Conflict (duplicate user, folder, or tag; encrypted file cannot be previewed). |
| `413` | Upload exceeds `MAX_UPLOAD_BYTES`. |
| `415` | WebDAV upload rejected by the MIME whitelist. |
| `416` | Requested byte range is not satisfiable. |
| `429` | Rate limit exceeded. |
| `500` | Unexpected server error. |
| `502` | Telegram download failed while streaming a shared link. |

## Rate limits and headers

| Scope | Limit | Window |
| --- | --- | --- |
| All `/api/` routes | 100 requests | 15 minutes |
| `POST /api/auth/login` | 20 attempts | 1 hour |
| All `/webdav` routes | 5000 requests | 15 minutes |
| `/webdav` failed authentication | 20 attempts | 15 minutes |

Responses include the standardized `RateLimit-*` headers:

| Header | Description |
| --- | --- |
| `RateLimit-Limit` | Maximum requests allowed in the current window. |
| `RateLimit-Remaining` | Requests remaining in the current window. |
| `RateLimit-Reset` | Seconds until the window resets. |

::: info
The server is configured with `standardHeaders: true` and `legacyHeaders: false`, so the legacy
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers are not sent.
:::

## Auth

Base path: `/api/auth`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create an account and return tokens. |
| `POST` | `/auth/login` | Public | Authenticate with email and password. |
| `POST` | `/auth/refresh` | Public | Exchange a refresh token for a new access token. |
| `GET` | `/auth/me` | Bearer | Return the current user profile. |

### POST /auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password",
  "username": "user",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

Response (`201`):

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "telegramId": null,
      "username": "user",
      "firstName": "Ada",
      "storageQuotaBytes": null,
      "storageUsedBytes": 0
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### POST /auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "a-strong-password"
}
```

Response (`200`):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "username": "user",
      "storageQuotaBytes": null,
      "storageUsedBytes": 10485760
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### POST /auth/refresh

Request:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response (`200`):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1790000000000
  }
}
```

### GET /auth/me

Response (`200`):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "0f9a6d3e-1c2b-4a5d-8e7f-1234567890ab",
      "email": "user@example.com",
      "telegramId": null,
      "username": "user",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "avatarUrl": null,
      "storageQuotaBytes": null,
      "storageUsedBytes": 10485760,
      "isPremium": false,
      "premiumUntil": null
    }
  }
}
```

## Files

Base path: `/api/files`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/files/upload` | Bearer | Upload a file (streamed multipart). |
| `GET` | `/files` | Bearer | List files with filtering and pagination. |
| `GET` | `/files/search` | Bearer | Search files by filename. |
| `POST` | `/files/bulk` | Bearer | Bulk delete or move files. |
| `POST` | `/files/:id/download-url` | Bearer | Create a signed download URL. |
| `GET` | `/files/:id/download` | Bearer or signed URL | Stream the file as an attachment. |
| `POST` | `/files/:id/preview-url` | Bearer | Create a signed preview URL. |
| `GET` | `/files/:id/preview` | Bearer or signed URL | Stream the file inline. |
| `GET` | `/files/:id/versions` | Bearer | List version history. |
| `POST` | `/files/:id/revert/:versionId` | Bearer | Restore a previous version. |
| `POST` | `/files/:id/share` | Bearer | Create a public share link. |
| `PATCH` | `/files/:id` | Bearer | Update filename, folder, or favorite flag. |
| `PUT` | `/files/:id/tags` | Bearer | Replace the file's tags. |
| `DELETE` | `/files/:id` | Bearer | Soft-delete a file. |
| `GET` | `/files/s/:token` | Public | Access a shared link. |

### POST /files/upload

Multipart form upload. The body is parsed as a stream, so the file is never buffered in memory.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `file` | file | Yes | The file to upload. |
| `folderId` | string | No | Destination folder UUID. |
| `encrypt` | boolean | No | Encrypt the stored parts. |

Response (`201`):

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "file": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "displayFilename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isChunked": false,
      "partCount": 1,
      "isEncrypted": false
    },
    "versioned": false
  }
}
```

If a file with the same name already exists in the target folder, its previous content is saved as a
version and `versioned` is `true` with the message `"File updated (previous saved as version)"`.

### GET /files

Query parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `folderId` | UUID | — | Filter by folder. |
| `page` | integer | `1` | Page number. |
| `limit` | integer | `50` | Items per page. |
| `sortBy` | string | `createdAt` | Sort column. |
| `sortOrder` | `ASC`/`DESC` | `DESC` | Sort direction. |
| `includeDeleted` | boolean | `false` | Include soft-deleted files. |
| `favorite` | boolean | `false` | Only favorites. |
| `tagId` | UUID | — | Filter by tag. |

Response (`200`):

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "displayFilename": "report.pdf",
        "mimeType": "application/pdf",
        "fileSize": 5242880,
        "isFavorite": false
      }
    ],
    "total": 1,
    "currentPage": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### GET /files/search

Query parameters: `q` (required), `page`, `limit`.

### POST /files/bulk

Request:

```json
{
  "action": "move",
  "fileIds": [
    "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
  ],
  "folderId": "9f8e7d6c-5b4a-4938-8271-6f5e4d3c2b1a"
}
```

`action` is `"delete"` or `"move"`; `folderId` is used only for `move`. Response (`200`):

```json
{
  "success": true,
  "message": "Moved 2 file(s)",
  "data": { "count": 2 }
}
```

### POST /files/:id/download-url

Response (`200`):

```json
{
  "success": true,
  "data": {
    "url": "/api/files/7c9e6679-7425-40de-944b-e07fc1f90ae7/download?signature=eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

### POST /files/:id/preview-url

Returns a signed URL for inline viewing. Response (`200`):

```json
{
  "success": true,
  "data": {
    "url": "/api/files/7c9e6679-7425-40de-944b-e07fc1f90ae7/preview?signature=eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

::: warning
Encrypted files cannot be previewed. `GET /files/:id/preview` returns `409` for an encrypted file;
download it instead.
:::

### GET /files/:id/download and GET /files/:id/preview

These endpoints accept either a bearer token or a `signature` query parameter generated by the
`download-url` / `preview-url` endpoints. They support HTTP `Range` requests and respond with `206`
when a partial range is served.

```bash
# Using the signed URL returned by /download-url
curl -OJ "https://yourdomain.com/api/files/7c9e6679-.../download?signature=eyJ..."
```

### POST /files/:id/share

Request:

```json
{
  "expiresIn": 86400,
  "downloadLimit": 5,
  "password": "optional-password",
  "allowPreview": true
}
```

Response (`201`):

```json
{
  "success": true,
  "message": "Shared link created",
  "data": {
    "link": {
      "id": "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607",
      "shortUrl": "https://yourdomain.com/s/eyJhbGciOiJIUzI1NiJ9...",
      "expiresAt": "2026-10-01T12:00:00.000Z",
      "downloadLimit": 5,
      "usedDownloads": 0
    }
  }
}
```

### GET /files/s/:token (public)

The public shared-link endpoint. It returns file metadata by default, or streams the file when
`?download=true` is supplied and the link permits downloading.

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "originalFilename": "report.pdf",
      "displayFilename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isEncrypted": false,
      "uploadedAt": "2026-09-01T10:00:00.000Z"
    },
    "expiresAt": "2026-10-01T12:00:00.000Z",
    "allowDownload": true,
    "usedDownloads": 0,
    "downloadLimit": 5
  }
}
```

For password-protected links, send the password in the `X-Share-Password` header. Without it, the
endpoint responds with `{ "success": true, "requiresPassword": true, ... }`; with a wrong password it
responds `401` with `{ "success": false, "error": "Incorrect password" }`.

### PATCH /files/:id

```json
{
  "displayFilename": "renamed.pdf",
  "folderId": "9f8e7d6c-5b4a-4938-8271-6f5e4d3c2b1a",
  "isFavorite": true
}
```

Provide at least one field. Use `folderId: null` or `"root"` to move a file to the root.

### PUT /files/:id/tags

```json
{
  "tagIds": ["c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f"]
}
```

### DELETE /files/:id

Soft-deletes the file. Pass `?deleteFromTelegram=false` to keep the Telegram messages.

### GET /files/:id/versions and POST /files/:id/revert/:versionId

List version history, or restore one:

```json
{
  "success": true,
  "message": "Reverted to version 2",
  "data": {
    "version": {
      "id": "d4e5f607-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      "versionNumber": 2,
      "filename": "report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 5242880,
      "isChunked": false,
      "partCount": 1,
      "isEncrypted": false,
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  }
}
```

## Folders

Base path: `/api/folders`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/folders` | Bearer | List folders (optional `parentFolderId`). |
| `POST` | `/folders` | Bearer | Create a folder. |
| `PUT` | `/folders/:id` | Bearer | Rename a folder. |
| `DELETE` | `/folders/:id` | Bearer | Delete a folder subtree. |

Create request: `{ "name": "Documents", "parentFolderId": null, "icon": "folder" }`. Deleting a
folder detaches its files (moves them to the root) rather than deleting them.

## Telegram

Base path: `/api/user/telegram`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/user/telegram/connect` | Bearer | Connect a bot token and storage chat. |
| `PUT` | `/user/telegram/config` | Bearer | Update an existing Telegram configuration. |
| `GET` | `/user/telegram/status` | Bearer | Report connection status. |
| `DELETE` | `/user/telegram/unlink` | Bearer | Disconnect Telegram. |

Connect request and response (`201`):

```json
{
  "botToken": "123456789:AAExampleTokenValue",
  "chatId": "-1001234567890",
  "chatType": "channel",
  "username": "my_storage_channel"
}
```

```json
{
  "success": true,
  "message": "Telegram connected successfully",
  "data": {
    "id": "5e4d3c2b-1a09-4876-b5c4-d3e2f1a0b9c8",
    "chatType": "channel",
    "username": "my_storage_channel",
    "isSetupComplete": true
  }
}
```

The bot token and chat ID are validated against the Telegram API before they are stored. The
`config` update requires `botToken` and `chatId` together.

## Bots

Base path: `/api/bots` (multi-bot pool)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/bots` | Bearer | List the user's bot pool. |
| `POST` | `/bots` | Bearer | Add and validate a bot token. |
| `DELETE` | `/bots/:id` | Bearer | Remove a bot from the pool. |

Add request: `{ "token": "123456789:AAExampleTokenValue" }`.

## Shares

Base path: `/api/shares`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/shares` | Bearer | List links created by the user (`page`, `limit`). |
| `DELETE` | `/shares/:id` | Bearer | Revoke a shared link. |

## Tags

Base path: `/api/tags`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/tags` | Bearer | List tags with file counts. |
| `POST` | `/tags` | Bearer | Create a tag. |
| `PUT` | `/tags/:id` | Bearer | Rename or recolor a tag. |
| `DELETE` | `/tags/:id` | Bearer | Delete a tag. |

Create request: `{ "name": "work", "color": "#10b981" }`.

## Smart folders

Base path: `/api/smart-folders`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/smart-folders` | Bearer | List saved filters. |
| `POST` | `/smart-folders` | Bearer | Create a saved filter. |
| `DELETE` | `/smart-folders/:id` | Bearer | Delete a saved filter. |

Create request: `{ "name": "Recent images", "icon": "sparkles", "criteria": { "type": "image" } }`.
Supported criteria keys are `favorite`, `tagId`, `type`, and `q`.

## Previews

Base path: `/api/previews`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/previews/generate` | Bearer | Generate resized image previews. |

Request: `{ "fileId": "7c9e6679-7425-40de-944b-e07fc1f90ae7" }`. Only image files up to 25 MB are
supported; larger files return `413`. The response contains base64 data URLs.

## Stats

Base path: `/api/stats`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/stats/storage` | Bearer | Aggregate storage usage by category. |
| `GET` | `/stats/duplicates` | Bearer | Find files that share a checksum. |

## WebDAV

Base path: `/webdav` (not under `/api`)

WebDAV uses HTTP Basic authentication with the account email and password, and is intended for
Rclone and similar clients. The router allows 5000 requests per 15 minutes (configurable through
`WEBDAV_RATE_LIMIT_MAX`), while failed authentication attempts are limited separately to 20 per
15 minutes.

| Method | Purpose |
| --- | --- |
| `OPTIONS` | Advertise DAV capabilities (`DAV: 1, 2`). |
| `PROPFIND` | Directory listing (supports `Depth: 0` and `Depth: 1`). |
| `GET` | Download a file, with `Range` support. |
| `HEAD` | Return file headers without the body. |
| `PUT` | Upload a file (MIME whitelist enforced). |
| `DELETE` | Delete a file or folder. |
| `MKCOL` | Create a folder. |
| `MOVE` | Rename or move a file. |

Files are addressed by a flat path model, for example `/webdav/Documents/report.pdf`. See
[WebDAV & Rclone](/guide/webdav) for client setup.

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Liveness check returning a timestamp. |

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-09-27T12:00:00.000Z"
}
```

## Related pages

- [Configuration](/reference/configuration) — environment variables that shape API behavior.
- [Database Schema](/reference/database-schema) — models behind these resources.
- [Security](/guide/security) — tokens, signed URLs, and rate limits in context.
