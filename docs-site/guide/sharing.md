---
title: Sharing Files
description: Create, protect, and revoke public share links in Teldock with expiry, download limits, and optional passwords.
---

# Sharing Files

A share link lets someone outside your account download or preview a single file without
logging in. Links are created per file, can expire, can carry a download limit, and can be
password-protected.

## Creating a share link

Shares are created from a file's **Share** action in the dashboard, which calls
`POST /api/files/:id/share`. The request body accepts these options:

| Option | Type | Notes |
| ------ | ---- | ----- |
| `expiresIn` | integer seconds | Optional. Maximum `31536000` (365 days). Omit for no expiry. |
| `downloadLimit` | integer | Optional. Maximum `1000000`. Omit for unlimited downloads. |
| `password` | string | Optional. At most 72 bytes. |
| `allowPreview` | boolean | Optional. Defaults to `true`. |

The response contains the link metadata, including a ready-to-share `shortUrl`.

::: tip
The dashboard's quick-share button creates a link that expires in 24 hours with a download
limit of 5, then copies it to your clipboard.
:::

## The share URL

The public API path for a shared file is:

```
GET /api/files/s/:token
```

The `shortUrl` returned to the client (and shown on the Shares page) is built from your
configured `FRONTEND_URL` as `<FRONTEND_URL>/s/<token>`, so recipients open a friendly link
that resolves to the same token.

By default the endpoint returns **metadata** (filename, size, MIME type, expiry, and usage)
and records a view. To stream the file bytes instead, the recipient appends `?download=true`.
This requires the link to allow downloading, and each such request consumes one download from
the limit.

```
GET /api/files/s/<token>?download=true
```

If a link does not allow previewing, metadata requests are rejected; if it does not allow
downloading, download requests are rejected. When a link has expired or its download limit is
reached, the request is refused with `403`.

## Password-protected shares

When a link has a password, the password is checked **before** any download counter is
touched, so a wrong guess cannot burn the link's quota.

Programmatic access supplies the password in a header:

```http
GET /api/files/s/<token> HTTP/1.1
Host: your-host:3001
X-Share-Password: correct horse battery staple
```

If the password is missing, the endpoint responds with a normal `200` body containing
`requiresPassword: true` and the file name, which lets a client prompt for it. If the
password is wrong, the endpoint responds with `401 Incorrect password`.

In the browser, the recipient opens the share page, is prompted for the password, and the
page re-requests the file with the `X-Share-Password` header. `X-Share-Password` is in the
backend's allowed CORS headers, so the request is accepted from the configured frontend
origin.

## Managing and revoking shares

The **Shared Links** page at `/dashboard/shares` lists every link you have created. Each row
shows the file, whether it is password-protected, how many downloads it has used against its
limit, its expiry date, and a status badge when it is expired or has reached its limit. From
here you can copy a link again or revoke it.

Revoking a link deletes it immediately and the token stops working. The management endpoints
are:

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| `GET` | `/api/shares` | List your shares (paginated via `page` and `limit`) |
| `DELETE` | `/api/shares/:id` | Revoke a share |

Note that links are **created** with `POST /api/files/:id/share`; the `/api/shares` endpoints
only list and revoke existing links.

::: warning
Anyone who has the link can access the file until the link expires or you revoke it. For
sensitive files, always set an expiry and a password, and revoke the link as soon as it is no
longer needed. Treat a share link like a secret.
:::

::: info
Download and view counters are recorded server-side. A link that has reached its download
limit can no longer stream the file, but its metadata row remains until you revoke it.
:::

## Next steps

- [Using Teldock](/guide/usage) — upload, organize, and preview files.
- [Security](/guide/security) — the wider security model.
- [API Reference](/reference/api) — full endpoint list.
