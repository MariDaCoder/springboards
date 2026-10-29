# Springboards for Community Development — Launch Governance & Production Operating Model

**Canonical Production Domain:** `https://springboardsfcd.org`  
**Current Production Version:** `v2.4.0-production`  
**Status:** `OFFICIAL_LAUNCH_READY`

---

## 1. Launch Readiness Gate

All 11 pre-launch readiness gates are verified and enforced automatically via `npm run build` and `npm run qa`:

- [x] **Homepage Conversion Flow**: Matches the approved 9-section job-seeker-first wireframe (`Header/Nav` -> `Hero` -> `Quick Trust Strip` -> `Mission & Who We Serve` -> `How the Program Works` -> `What You'll Learn` -> `Eligibility & Expectations` -> `FAQ` -> `Final CTA + Footer`).
- [x] **Single Primary CTA Hierarchy**: `Apply for Training` is the primary conversion objective; secondary actions (`See How It Works`, `Volunteer`, `Partner`, `Donate`, `Download Documents`) are clearly lower priority.
- [x] **Cross-Device Interactive Integrity**: All links, modals, focus traps, and forms work across mobile (`375px`), tablet (`768px`), and desktop (`1280px+`).
- [x] **Zero Broken Paths**: 0 broken links, 0 missing images, 0 orphan modals, and controlled `404` responses (`404.html` for browsers, JSON `404` for `/api/*`).
- [x] **Confirmed Form Submissions**: All 5 public intake forms validate required fields, reject malformed email/phone inputs (`400`), deflect bots via hidden `website_url` honeypots, prevent double-submit, and persist submissions (`200`).
- [x] **Analytics & Conversion Beacons**: `page_view`, `button_click`, `faq_expand`, `form_start`, `form_submit_attempt`, `form_submit_success`, `form_submit_error`, and `web_vitals` events fire cleanly via `/analytics.js`.
- [x] **Live SEO Metadata**: Unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph/Twitter cards, single `<h1>`, and Schema.org JSON-LD (`NonProfit` / `EducationalOrganization` / `LocalBusiness`) on all 6 public pages.
- [x] **DNS, SSL & Domain Routing**: Automatic `301` redirect from `http://` to `https://`, `www.springboardsfcd.org` to `springboardsfcd.org`, and `.html` paths to clean canonical routes.
- [x] **Production Environment Variables**: Configured via `.env` / runtime environment (`DESIGNATED_INBOX`, `HR_INBOX`, `ALERT_EMAIL`, `BACKUP_ALERT_EMAIL`, `WORKSPACE_CONNECTED_EMAIL`, `ADMIN_ALLOWED_EMAILS`, `ADMIN_PASSCODE`, `STAFF_DEFAULT_PIN`, `ADMIN_SESSION_SECRET`, `ALLOWED_ORIGINS`, `ANALYTICS_ENABLED`, `SMTP_*`).
- [x] **Monitoring & Alerts Active**: `/api/health`, `/api/uptime`, `/api/monitoring/error`, `/api/governance/seo-audit`, and `/api/governance/readiness` active and armed.

---

## 2. Production Deployment Checklist

### A. Domain & Infrastructure
- Production domain: `https://springboardsfcd.org`
- HTTPS / SSL enforced via `app.set('trust proxy', 1)` + `301` HTTP-to-HTTPS redirect + HSTS
- `www.springboardsfcd.org` -> `301` -> `https://springboardsfcd.org`
- Clean canonical URLs: `/`, `/train`, `/eligibility`, `/volunteer`, `/partner`, `/donate`
- Live crawler endpoints: `/robots.txt` and `/sitemap.xml`

### B. Hosting & Runtime
- Node.js Express production server (`server.js`) listening on `0.0.0.0:3000`
- Environment-driven configuration with zero hardcoded internal credentials in client source
- Resilient dual persistence (Firestore + automatic per-operation local JSON/in-memory fallback)

### C. Security Guardrails
- `helmet` security headers & explicit `Content-Security-Policy`
- `express-rate-limit` on general API (`120 req/min`), public form endpoints (`25 req/15min`), and admin login (`10 req/15min`)
- Strict email & 10-digit US phone validation + silent `website_url` honeypot defense on all public forms
- Private `/backoffice` portal isolated with `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, and HMAC-SHA256 signed `HttpOnly; SameSite=Strict` session cookies

### D. Performance Guardrails
- `compression` (Gzip/Deflate) enabled on all responses
- Hashed static bundle caching (`Cache-Control: public, max-age=31536000, immutable` for `/assets/*`)
- HTML served with `Cache-Control: no-cache, must-revalidate` for instant content updates
- WebP image assets with explicit `width`/`height` attributes and `loading="lazy"` below the fold

---

## 3. Launch Governance Owner Structure & Sign-Offs

| Role | Designated Owner | Pre-Launch Gate | Status |
| :--- | :--- | :--- | :--- |
| **Technical Owner** | Marilynn Ward (`marilynnlward@gmail.com`) | Development & Infrastructure Complete | **Signed Off** |
| **QA Owner** | QA & Compliance Lead (`info@springboardsfcd.org`) | Functional QA Complete (0 Broken Paths) | **Signed Off** |
| **Marketing / SEO Owner** | Outreach & Search Discovery Lead (`info@springboardsfcd.org`) | SEO & Search Discovery Complete | **Signed Off** |
| **Content Owner** | Executive Director Marvin Thompson (`info@springboardsfcd.org`) | Content, Forms & Monitoring Complete | **Signed Off** |
| **Support & Security Owner** | Workforce Intake & Security Lead (`marilynnlward@gmail.com`) | Final Security & Support Review Complete | **Signed Off** |

---

## 4. Ongoing Site Health Monitoring (5 Layers)

1. **Uptime Monitoring (`/api/health`, `/api/uptime`)**:
   - Automated 60-second internal health probe + external uptime check compatibility.
   - Verifies process memory, `/sitemap.xml`, `/robots.txt`, and all 6 canonical routes.
2. **Error Monitoring (`POST /api/monitoring/error`)**:
   - Captures frontend runtime exceptions (`window.onerror`, `unhandledrejection`), missing asset load failures, and server `4xx`/`5xx` counts.
3. **Performance & Core Web Vitals Monitoring (`/analytics.js` -> `POST /api/analytics/event`)**:
   - Captures real-user `LCP` (Largest Contentful Paint), `CLS` (Cumulative Layout Shift), `INP` (Interaction to Next Paint), and page load time.
4. **SEO Monitoring (`GET /api/governance/seo-audit`)**:
   - Live programmatic audit of `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph tags, single `<h1>`, JSON-LD schema, and XML sitemap coverage across `/`, `/train`, `/eligibility`, `/volunteer`, `/partner`, `/donate`.
5. **Conversion Funnel Monitoring (`GET /api/analytics/stats`)**:
   - Tracks CTA clicks, form starts (`form_start`), form submission attempts (`form_submit_attempt`), verified conversions (`conversions`), validation errors (`errors`), referral sources, top pages, and device mix (`mobile`, `tablet`, `desktop`).

---

## 5. Launch Runbook

### Day of Launch
1. Run `npm run build && npm run lint && npm run qa` and confirm 0 failures.
2. Deploy production build and verify `https://springboardsfcd.org/` loads cleanly.
3. Verify `http://` -> `https://` and `www.` -> root `301` redirects.
4. Verify `/sitemap.xml`, `/robots.txt`, `/api/health`, and `/api/governance/readiness`.
5. Submit `https://springboardsfcd.org/sitemap.xml` in Google Search Console and request indexing for `/`, `/train`, `/eligibility`, `/volunteer`, `/partner`, and `/donate`.
6. Submit one live test inquiry and verify routing to `info@springboardsfcd.org` / `marilynnlward@gmail.com`.

### First 7 Days After Launch
- **Days 1–2**: Review `/backoffice` -> `Launch Governance & Health` and `Site Traffic & Observability` tabs for uptime, `4xx`/`5xx` counts, and initial candidate conversion rates.
- **Days 3–4**: Check Google Search Console coverage, indexing status, and mobile usability.
- **Days 5–7**: Review Core Web Vitals (`LCP`, `CLS`, `INP`), top CTA clicks, and honeypot spam deflection logs.
