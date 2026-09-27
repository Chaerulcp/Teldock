---
title: Contributing
description: Cara berkontribusi ke Teldock, termasuk standar kode, pemeriksaan lokal, dan proses pull request.
---

# Contributing

Terima kasih atas ketertarikan Anda untuk meningkatkan Teldock. Halaman ini merangkum cara mengusulkan
perubahan, standar kode yang diikuti proyek, serta pemeriksaan yang harus lolos sebelum perubahan
digabungkan.

## Memulai

1. Fork repositori di GitHub.
2. Clone fork Anda dan tambahkan remote upstream:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Teldock.git
   cd Teldock
   git remote add upstream https://github.com/Chaerulcp/Teldock.git
   ```

3. Pasang dependency untuk bagian yang Anda ubah:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Jalankan dev server (di terminal terpisah):

   ```bash
   cd backend && npm run dev     # API on http://localhost:3001
   cd frontend && npm run dev    # SPA on http://localhost:3000
   ```

Lihat [Installation](/id/guide/installation) untuk penyiapan lokal lengkap, termasuk database dan file
environment.

## Cara berkontribusi

- Cari issue berlabel `good first issue` atau `help wanted`.
- Komentari issue untuk mengklaimnya sebelum mulai bekerja, agar tidak terjadi pekerjaan ganda.
- Untuk fitur baru, buka issue untuk mendiskusikan pendekatannya sebelum implementasi.
- Untuk kerentanan keamanan, **jangan** membuka issue atau PR publik; laporkan secara privat.

## Standar kode

### Arsitektur berlapis

Jaga backend tetap berlapis dan hormati arah dependensinya:

```text
routes → controllers → services → models
```

- **Routes** mendeklarasikan endpoint dan memasang middleware (autentikasi, validasi).
- **Controllers** hanya menangani siklus request/response.
- **Services** berisi logika bisnis yang dapat dipakai ulang.
- **Models** memiliki akses data dan definisi skema.

Jangan menaruh query database di routes atau network call di layer presentasi.

### Kualitas kode

- Jaga fungsi tetap fokus; **maksimal 30–40 baris**.
- Gunakan **early return dan guard clause**; hindari nesting lebih dari dua level `if`/`else`.
- Utamakan **pengetikan eksplisit** dan hindari `any` atau map yang tidak terdefinisi.
- Gunakan `const` secara default, `let` hanya saat perlu reassignment, dan jangan pernah `var`.
- Gunakan `async`/`await` daripada rantai promise mentah bila lebih mudah dibaca.
- Pecah file yang mendekati 200–250 baris menjadi modul yang lebih kecil dan fokus.

### Keamanan dan penanganan error

- **Tanpa secret hardcoded.** Baca kredensial dari `.env`; ekstrak magic string menjadi konstanta.
- **Jangan pernah meninggalkan `catch` kosong.** Tangani atau lempar ulang dengan konteks.
- **Tangani respons Telegram 429** dengan exponential backoff, bukan retry langsung.
- **Validasi semua input** di batas dengan skema Zod.
- Sanitasi input untuk mencegah SQL injection, XSS, SSRF, dan path traversal.
- Jangan pernah membocorkan storage chat ID atau bot token ke response klien.
- Gunakan signed URL untuk akses download dan preview.

### Streaming

Jangan pernah menampung seluruh file di memori. Gunakan streaming atau chunking untuk upload dan
download berukuran besar; implementasi yang ada di
`backend/src/services/telegram-storage.service.js` adalah acuannya.

### Frontend

- Gunakan functional component dengan hooks.
- Kelola state dengan Zustand, bukan Redux.
- Tangani state loading dan error secara eksplisit.
- Jaga form dan dialog tetap aksesibel serta responsif.

### Database

- Gunakan query builder Sequelize (atau raw query bila sesuai) dengan nilai terparameterisasi.
- Tambahkan indeks untuk kolom yang sering di-query.
- Bungkus penulisan multi-langkah dalam transaction.

## Jalankan pemeriksaan secara lokal

Jalankan ini sebelum membuka pull request. CI menjalankan perintah yang sama.

```bash
# Backend: lint and unit tests
cd backend
npm run lint
npm test

# Frontend: production build must succeed
cd ../frontend
npm run build
```

::: tip
CI berjalan pada setiap push ke `main` dan setiap pull request. Pull request hanya digabungkan setelah
job `backend` (lint + test) dan `frontend` (build) hijau.
:::

## Konvensi commit

Teldock menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

| Tipe | Deskripsi |
| --- | --- |
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `docs` | Hanya dokumentasi |
| `style` | Pemformatan tanpa perubahan perilaku |
| `refactor` | Perubahan kode yang bukan fix maupun fitur |
| `perf` | Peningkatan performa |
| `test` | Menambah atau memperbarui test |
| `chore` | Pemeliharaan, dependency, tooling |

Contoh:

```bash
git commit -m "feat(auth): add email verification flow"
git commit -m "fix(upload): handle large file chunking properly"
git commit -m "docs(readme): clarify deployment requirements"
```

Hindari pesan yang kabur seperti `fixed stuff`, `update`, atau `WIP`.

## Proses pull request

1. Buat branch dari `main` dengan format `type/scope/description`, misalnya `feat/email-verification`.
2. Lakukan perubahan yang fokus; jaga diff tetap minimal dan hindari refactor yang tidak terkait.
3. Tambahkan atau perbarui test dan dokumentasi bersamaan dengan kode.
4. Jalankan pemeriksaan lokal di atas.
5. Push branch Anda dan buka pull request ke `main`.
6. Lengkapi deskripsi PR: apa yang berubah, issue terkait, cara pengujian, screenshot untuk perubahan
   UI, dan breaking change bila ada.
7. Tanggapi masukan review dengan commit tambahan alih-alih force-push bila memungkinkan.
8. Setelah disetujui dan CI hijau, maintainer akan menggabungkan PR.

### Checklist review

- [ ] Perubahan terbatas pada lingkup yang diminta.
- [ ] Arsitektur berlapis dipatuhi.
- [ ] Input divalidasi dan secret tidak di-hardcode.
- [ ] Error ditangani; tidak ada blok `catch` kosong.
- [ ] File besar di-streaming, bukan di-buffer.
- [ ] Test mencakup perilaku yang diubah.
- [ ] `npm run lint` dan `npm test` lulus di `backend`.
- [ ] `npm run build` lulus di `frontend`.
- [ ] Dokumentasi diperbarui saat perilaku berubah.

## Halaman terkait

- [Project Structure](/id/reference/project-structure) — lokasi setiap layer.
- [Security](/id/guide/security) — model keamanan yang harus dipatuhi perubahan Anda.
- [Changelog](/id/changelog) — bagaimana rilis dicatat.
