---
title: Using Teldock
description: Day-to-day use of Teldock — uploading, downloading, previewing, organizing files, version history, soft delete, and storage stats.
---

# Using Teldock

This page covers everyday use of the web app once your account exists and your Telegram
bot and channel are connected. If you have not done that yet, start with
[Connecting Telegram](/guide/telegram-setup) first.

## Signing in

Teldock uses an email and password account. The frontend exposes two public routes:

- `/register` — create an account.
- `/login` — sign in.

After a successful login you land on `/dashboard`. Access tokens are short-lived and are
refreshed in the background, so you stay signed in until you sign out or the refresh token
expires. The sign-out button lives at the bottom of the sidebar.

::: tip
Every user connects their own bot and channel. Your files are stored only in the channel
you control — there is no shared global storage.
:::

## The dashboard at a glance

The main view at `/dashboard` is composed of:

- A **sidebar** with navigation to All Files, Favorites, Browse (mobile view), Shared Links,
  Storage Stats, and Settings.
- Your **tags** and **smart folders** listed under the navigation, once you create them.
- A **storage widget** showing how much you have stored, and a warning card if Telegram is
  not connected yet.
- A **top bar** with the current view title, an in-folder search box, a New folder button,
  and a grid/list view toggle.
- A **breadcrumb bar** showing where you are in the folder hierarchy.

## Uploading files

Uploading starts from the drop zone at the top of the file list. You can either drag files
onto it or click **browse** to open the file picker. Multiple files are supported, and they
are uploaded to the folder you are currently viewing (shown as "into …" in the drop zone).

Each upload can be encrypted by enabling the **Encrypt** checkbox before selecting files.
Encryption is applied per file with AES-256-CTR and a random salt, so encrypted files cannot
be previewed in the browser — you must download them.

### How chunking works

Large files are split automatically. The backend reads the upload as a stream and emits
bounded parts of `TG_PART_SIZE` (default `18874368` bytes, roughly 18 MB) so it never holds
the whole file in memory. Each part is uploaded to your Telegram channel as a separate
document, and a single-part file keeps its original name while multi-part files are named
with a `.partN` suffix. In the UI, chunked files display a small `N×` badge showing the part
count.

The maximum accepted upload is controlled by `MAX_UPLOAD_BYTES` (default `2147483648` bytes,
or 2 GB). A file over that limit is rejected with `413 File too large`.

### Upload progress

Progress is tracked in the **Transfer Center**, a small panel that appears at the bottom
right of the window. It lists each transfer with a progress bar, a spinner while uploading,
a check when done, and an error message if something failed. You can minimize the panel or
clear completed transfers; the file list reloads automatically when a transfer finishes.

::: info
If a file with the same name already exists in the same folder, the upload replaces it and
the previous contents are saved as a version. See [Version history](#version-history).
:::

## Downloading and previewing

Downloads and previews are authorized by **short-lived signed URLs**. The client calls an
endpoint to mint a URL scoped to one file and one disposition, then opens that URL. The
signature expires after `FILE_ACCESS_TOKEN_EXPIRE` (default 5 minutes).

- **Download** uses `Content-Disposition: attachment` and streams the file with HTTP `Range`
  support, so resumable downloads and seek are handled by the browser or a download manager.
- **Preview** uses `Content-Disposition: inline` and the same `Range` support, which lets
  video and audio seek without downloading the whole file first.

Clicking a file opens the in-browser **file viewer** when the type is previewable. The viewer
supports:

| Type | How it is shown |
| ---- | --------------- |
| Images | Inline `<img>` preview |
| Video | HTML5 player with controls and auto-play |
| Audio | HTML5 audio player |
| PDF | Embedded PDF viewer |

Anything else is downloaded instead of previewed. Encrypted files are never previewed — the
viewer shows a message and offers the download.

::: tip
Selecting several files and choosing Download opens one signed URL per file. A single-file
download stays available after you close the tab because the signed URL is self-contained
until it expires.
:::

## Organizing your files

### Folders

Folders are hierarchical. Open a folder by clicking it, and use the breadcrumb bar to jump
back to any ancestor or to Home. The **New folder** button in the top bar creates a folder
inside the current one. Deleting a folder moves its files back to the root rather than
deleting them.

### Rename, move, and bulk actions

- **Rename** a file from its row/card action menu. The name is sanitized before saving.
- **Move** one or many files by selecting them and choosing Move, then picking a destination
  folder (or Home/root).
- **Bulk actions** operate on everything you have selected: download, move, and delete. Use
  the selection checkboxes and **Select all**, then the bulk toolbar that appears under the
  header.

### Favorites

Star any file to add it to the **Favorites** view in the sidebar. Favorites are a flat list
across all folders.

### Tags

Tags are user-defined labels with a color. Open the tag picker on a file to assign existing
tags or create a new one inline. Clicking a tag anywhere in the UI filters the dashboard to
files carrying that tag, and the sidebar lists your tags with their file counts.

### Search and smart folders

- The top-bar search box filters the files in the current folder as you type.
- Global search across all your files is available through the search endpoint and matches
  both the original and the display filename.
- **Smart folders** are saved filters. The sidebar renders each one as a shortcut that
  reopens the dashboard with the saved criteria (currently favorites and a tag).

## Version history

Teldock snapshots a file automatically when you overwrite it — that is, when you upload a
file whose name matches an existing file in the same folder. The previous state is stored as
a version before the new parts replace it.

To work with versions:

1. Open the **version history** from a file's action menu.
2. The modal lists each version with its number, filename, size, and timestamp.
3. Choose **Restore** to revert. Teldock first snapshots the current state as a new version,
   then rewrites the file from the selected version's snapshot.

Up to 10 versions are retained per file; older ones are pruned automatically.

::: info
Version history stores part references and metadata. It works for single-message, chunked,
and encrypted files alike.
:::

## Deleting and recovering files

Deleting a file marks it as soft-deleted in the database (`isDeleted` and `deletedAt`) and
frees its bytes from your storage-used counter. By default the corresponding Telegram
messages are removed at the same time.

Because the Telegram parts are deleted by default, recovery is only possible while those
parts still exist. The delete endpoint accepts `?deleteFromTelegram=false` to soft-delete the
metadata while leaving the Telegram messages in place, which is the safer choice if you want
the option to recover. Listing supports `includeDeleted=true` for auditing.

::: warning
There is no recycle-bin screen in the current build. Treat a normal delete as permanent, and
keep independent backups of anything important.
:::

## Storage statistics

The **Storage Stats** page at `/dashboard/stats` summarizes your account:

- Total storage used, file count, folder count, and encrypted-file count.
- A breakdown of bytes and file counts by category (images, videos, audio, documents,
  archives, other).
- A **duplicate files** section that groups files by checksum, shows the wasted space, and
  lets you delete redundant copies while keeping the original.

## Mobile view

A dedicated mobile-oriented layout is available at `/dashboard/mobile`, linked as **Browse**
in the sidebar. It offers a large touch-friendly header, folder and file lists, a search
field, and a bottom navigation bar for Home, Upload, Browse, and Profile.

## Relevant API endpoints

The UI is a client of the REST API. The endpoints behind these features are documented in
the [API reference](/reference/api); the most relevant are:

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| `POST` | `/api/files/upload` | Streamed multipart upload (chunked) |
| `GET` | `/api/files` | List files, filterable by folder, favorite, or tag |
| `GET` | `/api/files/search?q=` | Search files by name |
| `POST` | `/api/files/bulk` | Bulk move or delete |
| `POST` | `/api/files/:id/download-url` | Mint a signed download URL |
| `POST` | `/api/files/:id/preview-url` | Mint a signed preview URL |
| `GET` | `/api/files/:id/download` | Stream a download (supports `Range`) |
| `GET` | `/api/files/:id/preview` | Stream an inline preview (supports `Range`) |
| `PATCH` | `/api/files/:id` | Rename, move, or favorite a file |
| `PUT` | `/api/files/:id/tags` | Set a file's tags |
| `DELETE` | `/api/files/:id` | Soft-delete a file |
| `GET` | `/api/files/:id/versions` | List version history |
| `POST` | `/api/files/:id/revert/:versionId` | Revert to a version |
| `GET` | `/api/stats/storage` | Storage usage statistics |
| `GET` | `/api/stats/duplicates` | Duplicate-file statistics |

## Next steps

- [Sharing Files](/guide/sharing) — create and manage public links.
- [Multi-Bot Pool](/guide/multibot) — improve throughput with more bots.
- [WebDAV & Rclone](/guide/webdav) — mount Teldock as an OS drive.
