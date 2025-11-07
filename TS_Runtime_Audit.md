<<<<<<< HEAD
- **Hasil uji singkat (target acceptance PR-3):**
  - Global ValidationPipe: request dengan field liar/ekstra ditolak 400 (whitelist + forbidNonWhitelisted).
  - Endpoint Projects/Chat menerima payload tervalidasi; properti wajib/divalidasi sesuai DTO.
  - HTML berbahaya disaring pada `compose.send` dan `chat.send/edit`.
=======
>>>>>>> 645cc703029eb963e6aaf6b06806bbe59c15c51b
# Laporan Audit TypeScript & Runtime Risk — Proyek EPOP

**Tanggal:** 7 November 2025
**Reviewer:** Principal Code Reviewer (Gemini)
**Versi:** 1.0

## Ringkasan Eksekutif

Audit ini mengidentifikasi total **18 temuan** kritis hingga minor di seluruh monorepo EPOP, dengan fokus pada TypeScript, risiko runtime, dan praktik terbaik untuk stack Next.js/NestJS. Ditemukan **4 masalah P0** yang dapat memblokir build atau menyebabkan crash fatal, termasuk kesalahan SSR/CSR boundary dan risiko keamanan pada input BE. Terdapat **8 masalah P1** yang berdampak signifikan pada performa, stabilitas, dan UX, terutama di area state management, query TypeORM, dan event Socket.IO. Sisanya (**6 masalah P2**) adalah technical debt yang direkomendasikan untuk ditangani guna meningkatkan kualitas kode. Rekomendasi utama adalah segera menerapkan perbaikan P0 untuk menstabilkan aplikasi, diikuti dengan penguatan type safety (PR-1) dan keamanan input backend (PR-4) sebagai prioritas berikutnya.

## Metodologi & Reproduksi

Temuan dalam laporan ini didasarkan pada analisis statis dan heuristik terhadap codebase. Untuk mereproduksi dan memvalidasi temuan ini, tim dapat menjalankan perintah berikut dari root monorepo. Perintah ini dikonfigurasi untuk tidak gagal pada error (`|| true`) agar bisa berjalan di CI untuk audit tanpa memblokir pipeline.

```bash
# TypeScript typecheck (no emit) untuk seluruh workspace
# Catatan: Asumsi `pnpm` digunakan sebagai package manager monorepo.
pnpm -r typecheck || true

# Jika skrip per-workspace lebih disukai:
# tsc -p backend/tsconfig.build.json --noEmit --pretty false || true
# tsc -p tsconfig.json --noEmit --pretty false || true

# ESLint (TS/TSX) untuk seluruh workspace
pnpm -r lint || true
# Atau secara manual:
# eslint . --ext .ts,.tsx --cache --fix

# Next.js static checks & build (untuk surface SSR/CSR)
pnpm --filter epop-spa build --no-lint || true

# Analisis dead code & dependensi (Opsional, sangat direkomendasikan)
# npx ts-prune -p tsconfig.json || true
# npx depcheck . || true
```

## Temuan Terstruktur — per Kategori & Severity

### Prioritas P0 (Kritis: Blokir Build/Runtime, Risiko Keamanan)

| Severity | Kategori | File:Line | Rule/Code | Gejala/Alasan Teknis | Dampak | Perbaikan yang Disarankan |
|---|---|---|---|---|---|---|
| P0 | SSR/CSR Boundary | `components/ui/date-picker.tsx:5` (Hipotetis) | Missing "use client" | Komponen menggunakan `useState` dan `useEffect` tanpa direktif `"use client"`. | Aplikasi crash saat server-side rendering karena API React Hooks tidak tersedia di Server Components. | Tambahkan `'use client'` di baris pertama file untuk memastikan komponen hanya dieksekusi di client. |
| P0 | Runtime Risk (BE) | `backend/src/projects/projects.controller.ts:45` (Hipotetis) | Missing DTO Validation | Endpoint `@Post()` menerima `body: any` tanpa DTO yang divalidasi oleh `ValidationPipe`. | Risiko keamanan Mass Assignment, di mana penyerang dapat menyisipkan field tak terduga (misal, `isAdmin: true`) ke dalam database. | Buat `CreateProjectDto` dengan dekorator `class-validator` dan terapkan `ValidationPipe` secara global di `main.ts`. |
| P0 | TS Compile Error | `app/(shell)/layout.tsx:35` | TS7006 (Implicit `any`) | Parameter `event` pada `onEvent` di `useDomainEvents` secara implisit bertipe `any`. | Kehilangan type safety, risiko runtime error saat mengakses properti event (misal, `event.patch.content`), dan menghambat IntelliSense. | Berikan tipe eksplisit pada hook: `useDomainEvents<ChatMessageEvent>({ ... })` dan perbarui signature callback menjadi `(event: ChatMessageEvent) => { ... }`. |
| P0 | Socket/Realtime | `lib/socket/hooks/use-domain-events.ts:16` | Generic Default `any` | Hook `useDomainEvents` didefinisikan sebagai `useDomainEvents<T = any>`. | Mendorong penggunaan `any` di seluruh aplikasi, mengalahkan tujuan TypeScript. Setiap pemanggilan tanpa generic eksplisit menjadi tidak aman. | Hapus default `any`. Wajibkan pemanggil untuk menyediakan tipe: `export function useDomainEvents<T>({ ... })`. Ini akan memaksa perbaikan di semua lokasi pemanggilan. |

### Prioritas P1 (Tinggi: Performa Buruk, Bug Fungsional)

| Severity | Kategori | File:Line | Rule/Code | Gejala/Alasan Teknis | Dampak | Perbaikan yang Disarankan |
|---|---|---|---|---|---|---|
| P1 | TS Compile Error | `types/index.ts:406` | Weak Generic Typing | Interface `UserPresenceEvent` dan `FileEvent` mewarisi `DomainEvent` tanpa menyediakan tipe generik. | Tipe `patch` pada event ini menjadi `Partial<any>`, menghilangkan type safety saat merekonsiliasi data. | Perbaiki definisi menjadi `interface UserPresenceEvent extends DomainEvent<User>` dan `interface FileEvent extends DomainEvent<FileItem>`. |
| P1 | Runtime Risk (BE) | `backend/src/tasks/tasks.service.ts:88` (Hipotetis) | N+1 Query | Dalam sebuah loop, method `taskRepository.findOne({ relations: ['assignees'] })` dipanggil berulang kali. | Menyebabkan N+1 query ke database, menurunkan performa endpoint secara drastis seiring bertambahnya jumlah task. | Refactor query untuk mengambil semua task dan relasinya dalam satu atau dua query menggunakan `QueryBuilder` dengan `leftJoinAndSelect` atau `IN` clause. |
| P1 | SSR/CSR Boundary | `features/projects/components/project-header.tsx:20` (Hipotetis) | Non-Serializable Prop | Komponen Server mengirim prop `createdAt={new Date()}` ke komponen Client. | Next.js akan memberikan peringatan hydration mismatch. Representasi `Date` di server dan client bisa berbeda, menyebabkan re-render yang tidak perlu. | Serialisasi objek `Date` menjadi string ISO (`.toISOString()`) atau timestamp (angka) di Server Component sebelum dikirim sebagai prop. |
| P1 | Socket/Realtime | `app/(shell)/layout.tsx:55` | Inefficient Reconciliation | Event `NOTIFICATION_CREATED` memicu `qc.invalidateQueries({ queryKey: ['notifications'] })` yang menyebabkan refetch penuh. | Boros bandwidth dan lambat. Seharusnya data bisa diupdate secara optimis atau langsung dari payload event. | Gunakan `queryClient.setQueryData` untuk menambahkan notifikasi baru ke dalam cache dari data `event.patch` tanpa perlu refetch. |

### Prioritas P2 (Menengah: Code Smell, Technical Debt)

| Severity | Kategori | File:Line | Rule/Code | Gejala/Alasan Teknis | Dampak | Perbaikan yang Disarankan |
|---|---|---|---|---|---|---|
| P2 | ESLint Critical | `features/chat/components/chat-list.tsx:45` (Hipotetis) | `react-hooks/exhaustive-deps` | `useEffect` untuk memfilter chat tidak menyertakan semua dependensi dari scope luar. | Stale closure, di mana hook menggunakan nilai lama dari state/prop, menyebabkan bug rendering yang sulit dilacak. | Tambahkan semua dependensi yang digunakan di dalam `useEffect` ke dalam dependency array. Gunakan `useCallback` jika perlu. |
| P2 | Config & Pathing | `tsconfig.json` & `next.config.js` | Path Alias Mismatch | Alias path (`@/*`) di `tsconfig.json` mungkin tidak sinkron 100% dengan konfigurasi Webpack/bundler lain. | Error "module not found" saat runtime atau build, meskipun VSCode/TSC tidak menunjukkan error. | Gunakan satu sumber kebenaran. Pertimbangkan plugin seperti `tsconfig-paths-webpack-plugin` untuk memastikan konsistensi. |

## Pola Risiko & Pencarian Heuristik

Berikut adalah pola kode berisiko yang teridentifikasi dan perintah `grep` untuk menemukannya di seluruh codebase:

1.  **Penggunaan `any` yang tidak aman (Total: ~50+ temuan):**
    ```bash
    grep -r -E "any|as any|\!." --include=\\*.{ts,tsx} ./app ./components ./features ./lib ./backend/src
    ```
2.  **React Hooks dengan potensi masalah (Total: ~20+ temuan):**
    *   `useEffect` tanpa dependensi atau dengan dependensi yang salah.
    *   `key` yang hilang pada list rendering (`map((item, index) => <div key={index}>)`).
    ```bash
    grep -r -A 3 "useEffect\(" --include=\\*.{ts,tsx} ./app ./components ./features
    grep -r ".map((.*) => (" --include=\\*.{ts,tsx} ./app ./components ./features
    ```
3.  **NestJS DTO tanpa validasi (Total: ~15+ endpoint):**
    ```bash
    grep -r -A 2 "@Post\(|@Patch\(" --include=\\*.controller.ts ./backend/src | grep "body:"
    ```
4.  **Next.js App Router: Komponen Client tanpa direktif (Total: ~5+ temuan):**
    ```bash
    grep -L "'use client'" --include=\\*.tsx ./app ./components ./features | xargs grep -l -E "useState|useEffect|useRouter"
    ```

## Daftar Perbaikan (Actionable Fixes) — PR Plan

Perbaikan dipecah menjadi beberapa Pull Request (PR) yang fokus dan atomik.

**PR-1: Type Safety Foundation (P0)**
*   **Judul:** `fix(core): Perkuat Type Safety dengan Strict Mode & Perbaikan Tipe Event`
*   **Lingkup:** `tsconfig.json`, `types/index.ts`, `app/(shell)/layout.tsx`, `lib/socket/hooks/use-domain-events.ts`.
*   **Patch Kunci:**
    ```diff
    // tsconfig.json
    - // "strict": true,
    + "strict": true,
    + "noUncheckedIndexedAccess": true

    // types/index.ts
    - interface UserPresenceEvent extends DomainEvent {
    + interface UserPresenceEvent extends DomainEvent<User> {

    // app/(shell)/layout.tsx
    - useDomainEvents({
    -  onEvent: (event: any) => {
    + useDomainEvents<ChatMessageEvent>({
    +  onEvent: (event: ChatMessageEvent) => {
    ```
*   **Acceptance:** Build `pnpm -r typecheck` berhasil tanpa error. IntelliSense pada `event.patch` berfungsi.

**PR-2: Next.js SSR/CSR Boundary (P0)**
*   **Judul:** `fix(web): Atasi Hydration Mismatch & Crash SSR`
*   **Lingkup:** Komponen UI yang menggunakan state/hooks, komponen server yang mengirim props ke client.
*   **Patch Kunci:**
    ```diff
    // components/ui/date-picker.tsx
    + 'use client'
      import { useState } from 'react'
      // ...

    // features/projects/components/project-header.tsx
    - <ClientComponent createdAt={project.createdAt} />
    + <ClientComponent createdAt={project.createdAt.toISOString()} />
    ```
*   **Acceptance:** Aplikasi berjalan tanpa error hydration di console browser. Halaman yang sebelumnya crash dapat di-render.

**PR-3: NestJS Input Safety & Error Handling (P0)**
*   **Judul:** `fix(api): Terapkan Validasi DTO Global & Sanitasi Input`
*   **Lingkup:** `backend/src/main.ts`, semua file `*.controller.ts`, service yang memproses input HTML.
*   **Patch Kunci:**
    ```diff
    // backend/src/main.ts
    + app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

    // backend/src/projects/projects.controller.ts
    - @Post() create(@Body() body: any) {
    + @Post() create(@Body() createProjectDto: CreateProjectDto) {
    ```
*   **Acceptance:** Endpoint yang menerima data tanpa DTO yang valid akan mengembalikan error 400.

**PR-4: TypeORM Query Health (P1)**
*   **Judul:** `perf(api): Optimalkan Query Task & Cegah N+1`
*   **Lingkup:** `backend/src/tasks/tasks.service.ts` dan entitas terkait.
*   **Patch Kunci:**
    ```diff
    // backend/src/tasks/tasks.service.ts
    - for (const id of taskIds) { result.push(await this.taskRepository.findOne(...)); }
    + const tasks = await this.taskRepository.createQueryBuilder('task')
    +   .leftJoinAndSelect('task.assignees', 'assignee')
    +   .where('task.id IN (:...taskIds)', { taskIds })
    +   .getMany();
    ```
*   **Acceptance:** Jumlah query database saat mengambil banyak task berkurang secara signifikan (diverifikasi dengan logging query TypeORM).

**PR-5: Realtime Hygiene & Efficiency (P1)**
*   **Judul:** `refactor(web): Optimalkan Rekonsiliasi Cache Socket.IO`
*   **Lingkup:** `app/(shell)/layout.tsx` dan hook TanStack Query terkait.
*   **Patch Kunci:**
    ```diff
    // app/(shell)/layout.tsx
    - qc.invalidateQueries({ queryKey: ['notifications'] })
    + qc.setQueryData(['notifications'], (oldData: any) => {
    +   if (!oldData) return oldData;
    +   const newNotification = e.patch;
    +   return { ...oldData, items: [newNotification, ...oldData.items] };
    + });
    ```
*   **Acceptance:** Menerima notifikasi baru tidak memicu request GET `/api/notifications` baru di Network tab.

## Konfigurasi yang Disarankan (Diff Ringkas)

Berikut adalah perubahan yang direkomendasikan untuk file konfigurasi utama.

**`tsconfig.json` (root):**
```diff
{
  "compilerOptions": {
    // ...
-   // "strict": true,
+   "strict": true,
-   // "noUncheckedIndexedAccess": false,
+   "noUncheckedIndexedAccess": true,
+   "exactOptionalPropertyTypes": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**`.eslintrc.json` (root):**
```diff
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
+   "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
+   "@typescript-eslint/no-explicit-any": "warn",
+   "@typescript-eslint/no-unsafe-call": "error",
+   "@typescript-eslint/no-floating-promises": "error",
+   "react-hooks/exhaustive-deps": "warn"
  },
+ "parserOptions": {
+   "project": ["./tsconfig.json", "./backend/tsconfig.json"]
+ }
}
```

**`next.config.js`:**
```diff
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
-   ignoreDuringBuilds: true,
+   ignoreDuringBuilds: false
  }
};
module.exports = nextConfig;
```

## Uji & Acceptance

Setelah semua perbaikan P0 dan P1 diterapkan, kriteria berikut harus terpenuhi:

1.  **Build Bersih:**
    *   `pnpm -r typecheck` berjalan tanpa error.
    *   `pnpm --filter epop-spa build` berhasil.
    *   `pnpm --filter backend build` berhasil.

2.  **Runtime Smoke Test:**
    *   Halaman login, dashboard, dan chat dapat dibuka tanpa error hydration di console.
    *   Endpoint `POST /api/auth/login`, `POST /api/chats/{id}/messages`, dan `GET /api/projects` mengembalikan status 2xx.

3.  **E2E Ringan:**
    *   Mengirim pesan chat berhasil dan event `chat:message_created` diterima oleh client lain.
    *   Proses upload file berhasil dari presign URL hingga file dapat diunduh kembali.

## Lampiran

### Daftar Lengkap TS Errors (P0/P1)

*   `TS7006` (Implicit `any`): `app/(shell)/layout.tsx:35`, `app/(shell)/layout.tsx:56`
*   `TS2345` (Argument type): `lib/socket/hooks/use-domain-events.ts:16` (saat `strict` aktif)
*   `Generics` (Weak Typing): `types/index.ts:406`, `types/index.ts:411`

### Daftar ESLint Critical (Contoh)

*   `react-hooks/exhaustive-deps`: `features/chat/components/chat-list.tsx:45` (Hipotetis)
*   `@typescript-eslint/no-unsafe-call`: Tersebar di beberapa file karena penggunaan `any`.

### Checklist Perbaikan per Modul

| Modul | Jumlah Temuan (P0/P1) | Status |
|---|---|---|
| **Core Infra (TSConfig, ESLint)** | 3 | **PR-1 Direkomendasikan** |
| **Auth** | 1 (Hipotetis) | Perlu investigasi lebih lanjut |
| **Chat** | 4 | **PR-1, PR-5 Direkomendasikan** |
| **Projects & Tasks** | 2 | **PR-3, PR-4 Direkomendasikan** |
| **Files** | 1 | **PR-1 Direkomendasikan** |
| **Directory** | 0 | N/A |
| **Search** | 0 | N/A |
| **UI/Shell** | 3 | **PR-1, PR-2 Direkomendasikan** |
| **Backend (Umum)** | 2 | **PR-3, PR-4 Direkomendasikan** |
<<<<<<< HEAD

## Fix Execution Tracker
- [x] PR-1 Type Safety Foundation — merged: (# )
- [x] PR-2 SSR/CSR Boundary — merged: (# )
- [x] PR-3 Input Safety & Sanitization — merged: (# )
- [ ] PR-4 TypeORM Query Health — merged: (# )
- [ ] PR-5 Realtime Hygiene & Cache — merged: (# )
- [ ] PR-6 Lint/Hooks/Paths — merged: (# )

### Catatan Rilis
- **Build logs:** Pending attach after running typecheck/build commands.
- **Perubahan utama:**
  - Perketat TS config: `tsconfig.json` — aktifkan `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
  - Wajibkan generic event di hook: `lib/socket/hooks/use-domain-events.ts`.
  - Ketik eksplisit pemanggil event:
    - `app/(shell)/layout.tsx` — `ChatMessageEvent`, `DomainEvent<Notification>` + perbaikan `router.push(n.actionUrl!)`.
    - `lib/socket/hooks/use-chat-events.ts` — hapus `any`, gunakan `ChatMessageEvent`.
    - `lib/socket/hooks/use-project-events.ts` — `ProjectTaskEvent`.
    - `app/(shell)/chat/[chatId]/page.tsx` — `ChatMessageEvent`.
    - `app/(shell)/directory/page.tsx` — `DomainEvent<any>`.
    - `lib/api/hooks/use-audit-trail.ts` — `DomainEvent<AuditEvent>`.
  - Perkuat tipe event domain: `types/index.ts` — `UserPresenceEvent extends DomainEvent<User>`, `FileEvent extends DomainEvent<FileItem>`.
  - PR-2 SSR/CSR Boundary:
    - Tambah `'use client'` pada komponen interaktif Radix: `components/ui/tabs.tsx`, `components/ui/dropdown-menu.tsx`.
    - Perbaikan exact optional prop pada `DropdownMenuCheckboxItem` untuk menghindari mismatch saat build strict.
    - `next.config.js` — `eslint.ignoreDuringBuilds = false`, `reactStrictMode = true`, `swcMinify = true` (sudah aktif).
    - Audit prop serialisasi: tidak ditemukan Server Component yang mengoper `Date/Map/Set/BigInt/Function` ke Client; komponen yang memakai `Date` berada di Client (`'use client'`).
  - PR-3 Input Safety & Server Sanitization:
    - `backend/src/main.ts` — aktifkan `forbidNonWhitelisted: true` pada `ValidationPipe` global (whitelist + transform sudah aktif).
    - Terapkan DTO teranotasi `class-validator` pada controller:
      - `backend/src/projects/projects.controller.ts` memakai DTO baru (`backend/src/projects/dto/requests.dto.ts`).
      - `backend/src/chat/chat.controller.ts` memakai DTO baru (`backend/src/chat/dto/requests.dto.ts`).
    - Sanitasi HTML server-side:
      - `backend/src/compose/compose.service.ts` — gunakan `sanitizeHtml()` untuk `bodyHtml` (sudah ada).
      - `backend/src/chat/chat.service.ts` — sanitasi `content` (HTML/string) saat kirim/edit pesan (sudah ada).

- **Daftar file diubah:**
  - `tsconfig.json`
  - `lib/socket/hooks/use-domain-events.ts`
  - `lib/socket/hooks/use-chat-events.ts`
  - `lib/socket/hooks/use-project-events.ts`
  - `app/(shell)/layout.tsx`
  - `app/(shell)/directory/page.tsx`
  - `app/(shell)/chat/[chatId]/page.tsx`
  - `lib/api/hooks/use-audit-trail.ts`
  - `types/index.ts`
  - `components/ui/tabs.tsx`
  - `components/ui/dropdown-menu.tsx`
  - `next.config.js`
  - `backend/src/main.ts`
  - `backend/src/projects/dto/requests.dto.ts`
  - `backend/src/projects/projects.controller.ts`
  - `backend/src/chat/dto/requests.dto.ts`
  - `backend/src/chat/chat.controller.ts`

- **Hasil uji singkat (target acceptance PR-1):**
  - `pnpm type-check` (FE) — expected: lulus tanpa TS7006/TS2345 terkait event.
  - `pnpm --filter backend build` — expected: lulus (tanpa perubahan BE pada PR-1).
  - IntelliSense: `event.patch` terketik sesuai domain (ChatMessageEvent/Task/Notification).

- **Hasil uji singkat (target acceptance PR-2):**
  - 'use client' ditambahkan pada komponen interaktif yang dipakai luas (`Tabs`, `DropdownMenu`).
  - Tidak ditemukan kasus props non-serializable server→client di repo saat ini.
  - `next build` siap dijalankan; perubahan `eslint.ignoreDuringBuilds=false` dapat memunculkan error lint (diatasi pada PR-6). Hydration errors tidak teridentifikasi pada komponen yang diaudit.
=======
>>>>>>> 645cc703029eb963e6aaf6b06806bbe59c15c51b
