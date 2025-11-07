# Security Controls

- **Headers & CSP** (`backend/src/main.ts`)
  - Helmet with CSP:
    - `default-src 'none'`
    - `img-src 'self' data:`
    - `style-src 'self' 'unsafe-inline'`
    - `script-src 'self'`
    - `connect-src 'self'`
    - `frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`; CORP same-origin; disable x-powered-by.

- **Rate limiting** (`backend/src/app.module.ts`)
  - Global `ThrottlerGuard`; window/limit via env `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`.

- **Request limits**
  - JSON/urlencoded body size: 10MB (`express.json/urlencoded`).
  - File upload size limit: 50MB (presign condition & server validation) in `backend/src/files/files.service.ts`.
  - MIME hardening: allowlist (png, jpeg, gif, webp, svg, pdf, txt, md, json, zip).

- **Auth tokens**
  - JWT in httpOnly cookies; refresh rotation (one-time JTI per session).
  - Sessions stored in Redis under `sess:*`.

- **Idempotency**
  - Header `Idempotency-Key`, cached 24h in Redis for write operations.

- **HTML sanitization**
  - Mail/compose body sanitized server-side via `sanitizeHtml()` in `backend/src/common/utils/sanitize-html.ts`.

- **Antivirus (ClamAV) integration**
  - Queue: `filescan` (BullMQ) via `FILESCAN_QUEUE`.
  - Worker: `backend/src/workers/file-scan.worker.ts` streams S3 object to clamd `INSTREAM`, sets `files.status` to `ready`/`infected`/`failed`.
  - Flow: `attach()` and `confirm()` enqueue scan; downloads are blocked unless `status=ready`.
  - Env toggles: `CLAMAV_ENABLED`, `CLAMAV_HOST`, `CLAMAV_PORT`. See `.env.example`.
  - Local dev: add a `clamav` container or point to local daemon.

- **2FA (TOTP) & OAuth2 (Planned/Optional)**
  - Roadmap: add TOTP enrollment (issuer `EPOP`, user email), QR code provisioning, backup codes, step-up on login.
  - OAuth2 providers: Google/Microsoft with Passport strategies.
  - Env toggles (planned): `AUTH_2FA_ENABLED`, `OAUTH_GOOGLE_ENABLED`, `OAUTH_MS_ENABLED`.
  - Status: Not enabled by default; tracked in `EPOP_STATUS_V3(Gemini).md` Wave-3.
