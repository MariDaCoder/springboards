import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${label}${detail ? ' — ' + detail : ''}`);
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('==============================================================');
console.log(' SPRINGBOARDS FUNCTIONAL QA SUITE (5-PHASE ZERO-BROKEN-PATH)');
console.log('==============================================================\n');

// ---------------------------------------------------------------------------
// PHASE 1: STATIC HTML, ANCHOR, ASSET & SEO METADATA VERIFICATION
// ---------------------------------------------------------------------------
console.log('Phase 1: Static HTML, Anchor, Asset & Metadata Verification...');

const publicPages = [
  'index.html',
  'train.html',
  'eligibility.html',
  'volunteer.html',
  'partner.html',
  'donate.html'
];

const allHtmlFiles = [...publicPages, 'backoffice.html', '404.html'];
const validRoutes = new Set([
  '/',
  '/train',
  '/eligibility',
  '/volunteer',
  '/partner',
  '/donate',
  '/backoffice',
  '/portal',
  '/404',
  '/sitemap.xml',
  '/robots.txt',
  '/api/backoffice/candidate-sheets/csv'
]);

for (const file of allHtmlFiles) {
  const filePath = path.join(rootDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `[${file}] File exists on disk`);
  if (!exists) continue;

  const html = fs.readFileSync(filePath, 'utf8');

  // Collect all IDs in this document
  const ids = new Set();
  for (const m of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }

  // Check H1 count on public pages
  if (publicPages.includes(file)) {
    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    assert(h1Matches.length === 1, `[${file}] Exactly 1 <h1> heading`, `Found ${h1Matches.length}`);
    assert(/<title>[^<]+<\/title>/i.test(html), `[${file}] Has non-empty <title>`);
    assert(/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html), `[${file}] Has <meta name="description">`);
    assert(/<link\s+rel=["']canonical["']\s+href=["']https:\/\/springboardsfcd\.org[^"']*["']/i.test(html), `[${file}] Has canonical URL`);
    assert(/<meta\s+property=["']og:title["']/i.test(html), `[${file}] Has og:title`);
    assert(/<meta\s+property=["']og:description["']/i.test(html), `[${file}] Has og:description`);
    assert(/<meta\s+property=["']og:image["']/i.test(html), `[${file}] Has og:image`);
    assert(/<script\s+type=["']application\/ld\+json["']>/i.test(html), `[${file}] Has Schema.org JSON-LD`);
  }

  // Verify all <a href="..."> links
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>/gi)) {
    const href = m[1].trim();
    assert(href.length > 0 && href !== '#', `[${file}] Non-empty link href (${href || 'EMPTY'})`);
    if (!href || href === '#') continue;

    if (href.startsWith('#')) {
      const targetId = href.slice(1);
      assert(ids.has(targetId), `[${file}] Anchor ${href} resolves to #${targetId} in DOM`);
    } else if (href.startsWith('/#')) {
      const homeHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
      const targetId = href.slice(2);
      const hasHomeId = new RegExp(`\\bid=["']${targetId}["']`, 'i').test(homeHtml);
      assert(hasHomeId, `[${file}] Cross-page anchor ${href} resolves in index.html`);
    } else if (
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('tel:')
    ) {
      const cleanPath = decodeURIComponent(href.split('?')[0].split('#')[0]);
      const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      const assetPath = path.join(rootDir, normalized.slice(1));
      const isValidTarget = validRoutes.has(normalized) || fs.existsSync(assetPath);
      assert(isValidTarget, `[${file}] Internal link/asset "${href}" resolves to valid route or file`);
    }
  }

  // Verify all <img src="...">, <script src="...">
  for (const m of html.matchAll(/<(?:img|script)\b[^>]*\bsrc=["']([^"']*)["'][^>]*>/gi)) {
    const src = m[1].trim();
    assert(src.length > 0, `[${file}] Non-empty media/script src`);
    if (!src || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) continue;
    const cleanSrc = decodeURIComponent(src.split('?')[0].split('#')[0]);
    const relPath = cleanSrc.startsWith('/') ? cleanSrc.slice(1) : cleanSrc;
    assert(fs.existsSync(path.join(rootDir, relPath)), `[${file}] Asset "${src}" exists on disk`);
  }
}

console.log(`  ✓ Phase 1 checks completed (${passed} passed, ${failed} failed)\n`);

// ---------------------------------------------------------------------------
// PHASE 2: HOMEPAGE NAVIGATION, MODAL & FORM DOM INVENTORY
// ---------------------------------------------------------------------------
console.log('Phase 2: Homepage Navigation, Modal & Form Inventory...');

const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

// Required Navigation anchors/triggers
const expectedNavTargets = ['#top', '#our-mission', '#our-programs', '#how-it-works', '#faq', '#footer'];
for (const navHref of expectedNavTargets) {
  assert(indexHtml.includes(`href="${navHref}"`), `[Homepage Nav] Contains link to ${navHref}`);
}
assert(/class=["'][^"']*nav-apply-link\s+btn-candidate-trigger/i.test(indexHtml), '[Homepage Nav] Contains Apply trigger button');

// Required Modals and corresponding Triggers on index.html
const modalInventory = [
  { modalId: 'candidateModal', formId: 'candidateApplicationForm', triggerClass: 'btn-candidate-trigger', closeAttr: 'data-candidate-close' },
  { modalId: 'inquiryModal', formId: 'programInquiryForm', triggerClass: 'program-inquiry-button', closeAttr: 'data-inquiry-close' },
  { modalId: 'volunteerSignupModal', formId: 'volunteerSignupForm', triggerClass: 'event-signup-button', closeAttr: 'data-volunteer-close' },
  { modalId: 'partnerModal', formId: 'partnerApplicationForm', triggerClass: 'btn-partner-trigger', closeAttr: 'data-partner-close' },
  { modalId: 'donateModal', formId: 'donationPledgeForm', triggerClass: 'btn-donate-trigger', closeAttr: 'data-donate-close' },
  { modalId: 'documentModal', formId: null, triggerClass: 'btn-doc-trigger', closeAttr: 'data-doc-close' },
  { modalId: 'privacyModal', formId: null, triggerClass: 'openPrivacyModal', closeAttr: 'data-privacy-close' }
];

for (const item of modalInventory) {
  assert(indexHtml.includes(`id="${item.modalId}"`), `[Modal] #${item.modalId} exists in index.html`);
  assert(indexHtml.includes(item.closeAttr), `[Modal] #${item.modalId} has close trigger [${item.closeAttr}]`);
  assert(indexHtml.includes(item.triggerClass), `[Modal] #${item.modalId} has active trigger (${item.triggerClass}) on index.html`);
  if (item.formId) {
    assert(indexHtml.includes(`id="${item.formId}"`), `[Form] #${item.formId} exists inside #${item.modalId}`);
  }
}

// Interactive Progress Roadmap & Google Classroom Hub checks
assert(indexHtml.includes('id="participantJourneyRoadmap"'), '[How It Works] Interactive Participant Journey Roadmap exists');
assert((indexHtml.match(/class=["'][^"']*journey-step-item/g) || []).length === 5, '[How It Works] Contains 5 interactive roadmap milestones');
assert(indexHtml.includes('id="googleClassroomHub"'), '[How It Works] Google Classroom Learning Hub exists');
assert(indexHtml.includes('id="classroomSignInBtn"'), '[How It Works] Official Sign in with Google button exists');

const fbConfigRaw = fs.readFileSync(path.join(rootDir, 'firebase-applet-config.json'), 'utf8');
assert(fbConfigRaw.includes('1:651964189612:web:fc444ee616bf91da99c809'), '[Firebase] Connected to appId 1:651964189612:web:fc444ee616bf91da99c809');

console.log(`  ✓ Phase 2 checks completed (${passed} passed, ${failed} failed)\n`);

// ---------------------------------------------------------------------------
// PHASE 3: LIVE HTTP ROUTE, REDIRECT & 404 VERIFICATION
// ---------------------------------------------------------------------------
console.log('Phase 3: Live HTTP Route, Redirect & Controlled 404 Verification...');

async function runLiveTests() {
  const routes200 = [
    '/',
    '/train',
    '/eligibility',
    '/volunteer',
    '/partner',
    '/donate',
    '/backoffice',
    '/sitemap.xml',
    '/robots.txt',
    '/og-image.jpg',
    '/springboards_logo.png',
    '/springboards-community-flyer.webp'
  ];

  for (const route of routes200) {
    const res = await fetch(`${BASE_URL}${route}`);
    assert(res.status === 200, `[GET ${route}] returns 200 OK`, `Got ${res.status}`);
  }

  // Test clean redirects (301)
  const redirects301 = [
    ['/index.html', '/'],
    ['/train.html', '/train'],
    ['/eligibility.html', '/eligibility'],
    ['/volunteer.html', '/volunteer'],
    ['/partner.html', '/partner'],
    ['/donate.html', '/donate'],
    ['/portal', '/backoffice']
  ];

  for (const [fromRoute, expectedLocation] of redirects301) {
    const res = await fetch(`${BASE_URL}${fromRoute}`, { redirect: 'manual' });
    assert(res.status === 301, `[GET ${fromRoute}] returns 301 Redirect`, `Got ${res.status}`);
    assert(res.headers.get('location') === expectedLocation, `[GET ${fromRoute}] redirects to ${expectedLocation}`, `Got ${res.headers.get('location')}`);
  }

  // Test controlled 404 fallback
  const res404 = await fetch(`${BASE_URL}/non-existent-route-qa-check`);
  const body404 = await res404.text();
  assert(res404.status === 404, '[GET /non-existent-route-qa-check] returns 404 status', `Got ${res404.status}`);
  assert(body404.includes('Page Not Found') || body404.includes('404'), '[GET /non-existent-route-qa-check] renders custom 404 HTML');

  console.log(`  ✓ Phase 3 checks completed (${passed} passed, ${failed} failed)\n`);

  // ---------------------------------------------------------------------------
  // PHASE 4: API & FORM VALIDATION / HONEYPOT / SUBMISSION MATRIX
  // ---------------------------------------------------------------------------
  console.log('Phase 4: API & Form Validation, Honeypot & Submission Matrix...');

  async function postJson(endpoint, payload) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, headers: res.headers };
  }

  // 1. POST /api/inquiries
  const inqMissing = await postJson('/api/inquiries', { name: '', phone: '', email: '' });
  assert(inqMissing.status === 400 && inqMissing.data.error, '[POST /api/inquiries] Rejects empty fields with 400');

  const inqBadEmail = await postJson('/api/inquiries', { name: 'QA Tester', email: 'not-an-email' });
  assert(inqBadEmail.status === 400 && inqBadEmail.data.error, '[POST /api/inquiries] Rejects invalid email with 400');

  const inqHoneypot = await postJson('/api/inquiries', { name: 'Spam Bot', email: 'bot@spam.com', website_url: 'http://spam.com' });
  assert(inqHoneypot.status === 200 && inqHoneypot.data.success, '[POST /api/inquiries] Silently deflects honeypot bot spam');

  const inqValid = await postJson('/api/inquiries', { name: 'Marcus Vance', phone: '334-555-0142', email: 'marcus@example.com', program: 'Learn' });
  assert(inqValid.status === 200 && inqValid.data.success, '[POST /api/inquiries] Accepts valid inquiry with 200');

  // 2. POST /api/volunteer-signups
  const volMissing = await postJson('/api/volunteer-signups', { name: 'QA Volunteer' });
  assert(volMissing.status === 400 && volMissing.data.error, '[POST /api/volunteer-signups] Rejects missing contact info with 400');

  const volBadPhone = await postJson('/api/volunteer-signups', { name: 'QA Volunteer', phone: '12345' });
  assert(volBadPhone.status === 400 && volBadPhone.data.error, '[POST /api/volunteer-signups] Rejects invalid 5-digit phone with 400');

  const volHoneypot = await postJson('/api/volunteer-signups', { name: 'Bot', phone: '334-555-0199', website_url: 'http://spam.com' });
  assert(volHoneypot.status === 200 && volHoneypot.data.success, '[POST /api/volunteer-signups] Silently deflects honeypot bot spam');

  const volValid = await postJson('/api/volunteer-signups', {
    name: 'Denise Brooks',
    phone: '334-555-0188',
    email: 'denise@example.com',
    availability: 'morning',
    interest: 'tools-prep'
  });
  assert(volValid.status === 200 && volValid.data.success, '[POST /api/volunteer-signups] Accepts valid volunteer signup with 200');

  // 3. POST /api/candidates
  const candMissing = await postJson('/api/candidates', { name: 'A' });
  assert(candMissing.status === 400 && candMissing.data.error, '[POST /api/candidates] Rejects 1-char name / missing contact with 400');

  const candBadEmail = await postJson('/api/candidates', { name: 'Devon Carter', email: 'bad-email-format' });
  assert(candBadEmail.status === 400 && candBadEmail.data.error, '[POST /api/candidates] Rejects invalid email with 400');

  const candHoneypot = await postJson('/api/candidates', { name: 'Bot', phone: '334-555-0122', website_url: 'http://bot.tld' });
  assert(candHoneypot.status === 200 && candHoneypot.data.success, '[POST /api/candidates] Silently deflects honeypot bot spam');

  const candValid = await postJson('/api/candidates', {
    name: 'Devon Carter',
    phone: '(334) 555-0177',
    email: 'devon.carter@example.com',
    trade: 'Carpentry & Construction Technology',
    backgroundStatus: 'Opportunity Youth (Age 18-24)',
    transportation: 'Personal Vehicle',
    careerCenter: 'Need Help Registering'
  });
  assert(candValid.status === 200 && candValid.data.success, '[POST /api/candidates] Accepts valid candidate application with 200');

  // 4. POST /api/partnerships
  const partMissing = await postJson('/api/partnerships', { companyName: '', contactName: '' });
  assert(partMissing.status === 400 && partMissing.data.error, '[POST /api/partnerships] Rejects missing company/contact with 400');

  const partBadPhone = await postJson('/api/partnerships', { companyName: 'Valley Builders', contactName: 'Sam Hill', phone: '999' });
  assert(partBadPhone.status === 400 && partBadPhone.data.error, '[POST /api/partnerships] Rejects invalid phone with 400');

  const partHoneypot = await postJson('/api/partnerships', { companyName: 'Bot LLC', contactName: 'Bot', phone: '334-555-0199', website_url: 'http://spam' });
  assert(partHoneypot.status === 200 && partHoneypot.data.success, '[POST /api/partnerships] Silently deflects honeypot bot spam');

  const partValid = await postJson('/api/partnerships', {
    companyName: 'Chambers Framing LLC',
    contactName: 'Robert Hayes',
    phone: '334-555-0166',
    email: 'rhayes@chambersframing.com',
    partnershipType: 'Host Worksite / OJT Employer',
    tradeSpecialty: 'Carpentry & Framing'
  });
  assert(partValid.status === 200 && partValid.data.success, '[POST /api/partnerships] Accepts valid partnership inquiry with 200');

  // 5. POST /api/donations
  const donMissing = await postJson('/api/donations', { donorName: '' });
  assert(donMissing.status === 400 && donMissing.data.error, '[POST /api/donations] Rejects missing donor name with 400');

  const donBadEmail = await postJson('/api/donations', { donorName: 'Grace Community', email: 'invalid-email' });
  assert(donBadEmail.status === 400 && donBadEmail.data.error, '[POST /api/donations] Rejects invalid email with 400');

  const donBadPhone = await postJson('/api/donations', { donorName: 'Grace Community', email: 'grace@example.org', phone: '123' });
  assert(donBadPhone.status === 400 && donBadPhone.data.error, '[POST /api/donations] Rejects invalid phone with 400');

  const donHoneypot = await postJson('/api/donations', { donorName: 'Bot', email: 'bot@example.com', website_url: 'http://spam' });
  assert(donHoneypot.status === 200 && donHoneypot.data.success, '[POST /api/donations] Silently deflects honeypot bot spam');

  const donValid = await postJson('/api/donations', {
    donorName: 'East Alabama Community Foundation',
    phone: '334-555-0133',
    email: 'giving@eacf.org',
    donationType: 'financial_sponsorship',
    pledgeAmount: '$500 Textbooks & Exam Fees',
    taxReceiptRequested: true
  });
  assert(donValid.status === 200 && donValid.data.success, '[POST /api/donations] Accepts valid donation pledge with 200');

  // 6. GET /api/documents/list, /api/analytics/*, /api/health, /api/uptime, /api/workspace/status
  const docsRes = await fetch(`${BASE_URL}/api/documents/list`);
  const docsData = await docsRes.json();
  assert(docsRes.status === 200 && Array.isArray(docsData) && docsData.length > 0, '[GET /api/documents/list] Returns document list');

  const evtRes = await postJson('/api/analytics/event', {
    eventType: 'button_click',
    eventLabel: 'QA Test Click',
    sessionId: 'sess_qa_test'
  });
  assert(evtRes.status === 200 && evtRes.data.success, '[POST /api/analytics/event] Records analytics event');

  const statsRes = await fetch(`${BASE_URL}/api/analytics/stats`);
  const statsData = await statsRes.json();
  assert(statsRes.status === 200 && typeof statsData.totalPageViews === 'number', '[GET /api/analytics/stats] Returns analytics stats');

  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200 && healthData.status === 'healthy', '[GET /api/health] Returns healthy status');

  const uptimeRes = await fetch(`${BASE_URL}/api/uptime`);
  const uptimeData = await uptimeRes.json();
  assert(uptimeRes.status === 200 && uptimeData.monitoringActive === true, '[GET /api/uptime] Returns uptime monitoring status');

  const wsRes = await fetch(`${BASE_URL}/api/workspace/status`);
  const wsData = await wsRes.json();
  assert(wsRes.status === 200 && Boolean(wsData.designatedInbox), '[GET /api/workspace/status] Returns workspace status');

  // 7. Backoffice Auth & State Verification
  const badAuth = await postJson('/api/backoffice/auth', { type: 'admin', adminCode: 'wrong-code-9999' });
  assert(badAuth.status === 401, '[POST /api/backoffice/auth] Rejects invalid admin passcode with 401');

  const goodAuth = await postJson('/api/backoffice/auth', { type: 'admin', adminEmail: 'marilynnlward@gmail.com' });
  assert(goodAuth.status === 200 && goodAuth.data.success && goodAuth.data.token, '[POST /api/backoffice/auth] Authenticates allowed admin and issues signed session token');

  const boStateRes = await fetch(`${BASE_URL}/api/backoffice/state`, {
    headers: { Authorization: `Bearer ${goodAuth.data.token}` }
  });
  const boStateData = await boStateRes.json();
  assert(boStateRes.status === 200 && Array.isArray(boStateData.candidateApplications), '[GET /api/backoffice/state] Returns backoffice pipeline state');
  assert(boStateRes.headers.get('cache-control')?.includes('no-store'), '[GET /api/backoffice/state] Enforces Cache-Control: no-store');

  const csvRes = await fetch(`${BASE_URL}/api/backoffice/candidate-sheets/csv`, {
    headers: { Authorization: `Bearer ${goodAuth.data.token}` }
  });
  assert(csvRes.status === 200 && csvRes.headers.get('content-type')?.includes('text/csv'), '[GET /api/backoffice/candidate-sheets/csv] Exports CSV');

  console.log(`  ✓ Phase 4 & 5 checks completed (${passed} passed, ${failed} failed)\n`);

  // ============================================================================
  // PHASE 6: LAUNCH GOVERNANCE, OBSERVABILITY & LIVE SEO AUDIT VERIFICATION
  // ============================================================================
  console.log('Phase 6: Launch Governance, Observability & Live SEO Audit Verification...');

  assert(fs.existsSync(path.join(rootDir, 'LAUNCH_GOVERNANCE.md')), '[Governance] LAUNCH_GOVERNANCE.md exists on disk');

  const seoAuditRes = await fetch(`${BASE_URL}/api/governance/seo-audit`);
  const seoAuditData = await seoAuditRes.json();
  assert(seoAuditRes.status === 200 && seoAuditData.allPagesPassed === true, '[GET /api/governance/seo-audit] All 6 public pages pass live SEO, canonical, H1, OG, JSON-LD & sitemap audit');
  assert(seoAuditData.uniqueTitles === true, '[GET /api/governance/seo-audit] Unique <title> across all 6 public pages');
  assert(seoAuditData.sitemapLive === true && seoAuditData.robotsLive === true, '[GET /api/governance/seo-audit] Sitemap and robots.txt verified live');

  const readinessRes = await fetch(`${BASE_URL}/api/governance/readiness`);
  const readinessData = await readinessRes.json();
  assert(readinessRes.status === 200 && readinessData.status === 'OFFICIALLY_LAUNCH_READY', '[GET /api/governance/readiness] Launch Readiness Gate status is OFFICIALLY_LAUNCH_READY');
  assert(readinessData.allOwnersSignedOff === true && Array.isArray(readinessData.owners) && readinessData.owners.length === 5, '[GET /api/governance/readiness] All 5 Launch Governance owners signed off');

  const cwvEvtRes = await postJson('/api/analytics/event', {
    eventType: 'web_vitals',
    eventLabel: 'Core Web Vitals',
    sessionId: 'sess_qa_test',
    lcpMs: 920,
    clsScore: 0.01,
    inpMs: 38,
    loadTimeMs: 580
  });
  assert(cwvEvtRes.status === 200 && cwvEvtRes.data.success, '[POST /api/analytics/event] Records Core Web Vitals telemetry');

  const errMonRes = await postJson('/api/monitoring/error', {
    errorType: 'qa_test_exception',
    message: 'Simulated client error check',
    path: '/'
  });
  assert(errMonRes.status === 200 && errMonRes.data.recorded === true, '[POST /api/monitoring/error] Records frontend runtime error telemetry');

  const boGovRes = await fetch(`${BASE_URL}/api/backoffice/governance`, {
    headers: { Authorization: `Bearer ${goodAuth.data.token}` }
  });
  const boGovData = await boGovRes.json();
  assert(boGovRes.status === 200 && boGovData.governance && boGovData.observability, '[GET /api/backoffice/governance] Returns full Launch Governance & Observability state');
  assert(Array.isArray(boGovData.observability.alertRules) && boGovData.observability.alertRules.length === 7, '[GET /api/backoffice/governance] All 7 production alert rules armed');

  console.log(`  ✓ Phase 6 checks completed (${passed} passed, ${failed} failed)\n`);

  console.log('==============================================================');
  console.log(` QA SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveTests().catch((err) => {
  console.error('Fatal error during live QA suite:', err);
  process.exit(1);
});
