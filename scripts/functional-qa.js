/**
 * Comprehensive Functional QA Test Suite for Springboards for Community Development
 * Tests all routes, navigation anchors, modal IDs, image assets, form submissions,
 * validation errors, honeypot deflection, and API endpoints.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'http://localhost:3000';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: []
};

function recordSuite(name) {
  const suite = { name, tests: [] };
  results.suites.push(suite);
  return {
    assert(desc, condition, details = null) {
      results.total++;
      const ok = Boolean(condition);
      if (ok) {
        results.passed++;
        suite.tests.push({ desc, status: 'PASS' });
      } else {
        results.failed++;
        suite.tests.push({ desc, status: 'FAIL', details });
        console.error(`  ❌ FAIL: ${desc}`, details ? `-> ${JSON.stringify(details)}` : '');
      }
    }
  };
}

async function runQA() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE FUNCTIONAL QA AUDIT: SPRINGBOARDS FCD');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Route & HTTP Status Audit
  // -------------------------------------------------------------
  const s1 = recordSuite('1. HTTP Routes & Status Codes');
  const routeChecks = [
    { path: '/', expected: 200, contentType: 'text/html' },
    { path: '/train', expected: 200, contentType: 'text/html' },
    { path: '/eligibility', expected: 200, contentType: 'text/html' },
    { path: '/volunteer', expected: 200, contentType: 'text/html' },
    { path: '/partner', expected: 200, contentType: 'text/html' },
    { path: '/donate', expected: 200, contentType: 'text/html' },
    { path: '/backoffice', expected: 200, contentType: 'text/html' },
    { path: '/sitemap.xml', expected: 200, contentType: 'xml' },
    { path: '/robots.txt', expected: 200, contentType: 'text/plain' },
    { path: '/api/health', expected: 200, contentType: 'application/json' },
    { path: '/api/uptime', expected: 200, contentType: 'application/json' },
    { path: '/api/documents/list', expected: 200, contentType: 'application/json' },
    { path: '/unknown-route-qa-test', expected: 404, contentType: 'text/html' }
  ];

  for (const rc of routeChecks) {
    try {
      const res = await fetch(`${BASE_URL}${rc.path}`, { redirect: 'manual' });
      const cType = res.headers.get('content-type') || '';
      s1.assert(
        `Route ${rc.path} returns status ${rc.expected}`,
        res.status === rc.expected,
        { received: res.status, expected: rc.expected }
      );
      s1.assert(
        `Route ${rc.path} has expected content-type matching "${rc.contentType}"`,
        cType.toLowerCase().includes(rc.contentType),
        { received: cType, expected: rc.contentType }
      );
    } catch (err) {
      s1.assert(`Route ${rc.path} reachable`, false, { error: err.message });
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: DOM Anchors & Link Integrity (index.html)
  // -------------------------------------------------------------
  const s2 = recordSuite('2. Navigation Anchors & Target IDs in index.html');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // Extract all href="#..." from index.html
  const anchorMatches = [...indexHtml.matchAll(/href=["']#([^"']+)["']/g)].map(m => m[1]);
  const uniqueAnchors = [...new Set(anchorMatches)];

  // Extract all id="..." from index.html
  const idMatches = new Set([...indexHtml.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]));

  for (const anchor of uniqueAnchors) {
    if (anchor === '' || anchor === '!') continue;
    const exists = idMatches.has(anchor);
    s2.assert(`Anchor #${anchor} points to existing DOM element ID`, exists, { anchor });
  }

  // Verify critical nav anchor targets
  const criticalNavs = ['our-mission', 'how-it-works', 'our-programs', 'faq', 'footer'];
  for (const navId of criticalNavs) {
    s2.assert(`Critical Section #${navId} exists in document`, idMatches.has(navId), { navId });
  }

  // -------------------------------------------------------------
  // SUITE 3: Modal IDs & Trigger Attributes
  // -------------------------------------------------------------
  const s3 = recordSuite('3. Modal Elements & Accessibility Structure');
  const expectedModals = [
    { id: 'candidateModal', title: 'Candidate Pre-Qualification & Intake Modal', closeAttr: 'data-candidate-close' },
    { id: 'inquiryModal', title: 'Program Inquiry Modal', closeAttr: 'data-inquiry-close' },
    { id: 'volunteerSignupModal', title: 'Volunteer Registration Modal', closeAttr: 'data-volunteer-close' },
    { id: 'partnerModal', title: 'Employer & Community Partner Modal', closeAttr: 'data-partner-close' },
    { id: 'donateModal', title: 'Sponsor & Donor Pledge Modal', closeAttr: 'data-donate-close' },
    { id: 'privacyModal', title: 'Privacy Policy & Terms Modal', closeAttr: 'data-privacy-close' },
    { id: 'documentModal', title: 'Document Download Hub Modal', closeAttr: 'data-doc-close' }
  ];

  for (const modal of expectedModals) {
    const hasModal = idMatches.has(modal.id);
    s3.assert(`Modal #${modal.id} exists in DOM`, hasModal, { modal: modal.id });

    // Check accessibility attributes: role="dialog", aria-modal="true"
    const modalTagRegex = new RegExp(`<div[^>]+id=["']${modal.id}["'][^>]*>`, 'i');
    const match = indexHtml.match(modalTagRegex);
    if (match) {
      const tag = match[0];
      const hasRoleDialog = /role=["']dialog["']/i.test(tag);
      const hasAriaModal = /aria-modal=["']true["']/i.test(tag);
      const hasAriaLabel = /aria-label(?:ledby)?=["'][^"']+["']/i.test(tag);
      s3.assert(`Modal #${modal.id} has role="dialog"`, hasRoleDialog, { tag });
      s3.assert(`Modal #${modal.id} has aria-modal="true"`, hasAriaModal, { tag });
      s3.assert(`Modal #${modal.id} has aria-label or aria-labelledby`, hasAriaLabel, { tag });
    }

    // Check presence of close triggers
    const hasCloseTrigger = indexHtml.includes(modal.closeAttr);
    s3.assert(`Modal #${modal.id} has close handler attribute [${modal.closeAttr}]`, hasCloseTrigger);
  }

  // -------------------------------------------------------------
  // SUITE 4: Image & Static Asset Integrity on Disk
  // -------------------------------------------------------------
  const s4 = recordSuite('4. Static Assets & Media Verification');
  const htmlFiles = ['index.html', 'train.html', 'eligibility.html', 'volunteer.html', 'partner.html', 'donate.html'];
  const checkedImages = new Set();

  for (const file of htmlFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const imgMatches = [...content.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
    for (const src of imgMatches) {
      // Ignore external CDNs or data URIs
      if (src.startsWith('http') || src.startsWith('data:') || checkedImages.has(src)) continue;
      checkedImages.add(src);

      const cleanPath = src.split('?')[0].replace(/^\//, '');
      const localPath = path.join(ROOT, cleanPath);
      const exists = fs.existsSync(localPath);
      s4.assert(`Asset [${src}] referenced in ${file} exists on disk`, exists, { src, localPath });
    }
  }

  // -------------------------------------------------------------
  // SUITE 5: API Form Endpoints - Successful Valid Submissions
  // -------------------------------------------------------------
  const s5 = recordSuite('5. API Endpoints - Valid Submissions');

  // Test 5.1: Program Inquiry (/api/inquiries)
  try {
    const payload = {
      fullName: 'QA Test Applicant',
      email: 'qa.applicant@example.com',
      phone: '334-555-0199',
      programOfInterest: 'Construction Foundations',
      preferredSchedule: 'Day Classes',
      message: 'QA Automated Test Submission'
    };
    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/inquiries returns 200 with success status', res.status === 200 && body.success === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/inquiries call succeeded', false, { error: err.message });
  }

  // Test 5.2: Volunteer Signups (/api/volunteer-signups)
  try {
    const payload = {
      name: 'QA Volunteer Hero',
      email: 'qa.volunteer@example.com',
      phone: '334-555-0188',
      interests: ['Hands-on Mentorship', 'Classroom Assistant'],
      availability: 'Weekends',
      notes: 'QA Automated Volunteer Test'
    };
    const res = await fetch(`${BASE_URL}/api/volunteer-signups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/volunteer-signups returns 200 with success status', res.status === 200 && body.success === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/volunteer-signups call succeeded', false, { error: err.message });
  }

  // Test 5.3: Candidate Pre-Qualification (/api/candidates)
  try {
    const payload = {
      candidateName: 'QA Jane Doe',
      candidatePhone: '334-555-0177',
      candidateEmail: 'qa.janedoe@example.com',
      candidateAge: '18_24',
      candidateCounty: 'Chambers',
      candidateWorkStatus: 'unemployed',
      candidateTransportation: 'yes',
      candidateInterest: 'electrical',
      candidateNotes: 'QA Candidate Application Test'
    };
    const res = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/candidates returns 200 with success status', res.status === 200 && body.success === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/candidates call succeeded', false, { error: err.message });
  }

  // Test 5.4: Partnership Inquiries (/api/partnerships)
  try {
    const payload = {
      organizationName: 'QA Partner Corp',
      contactPerson: 'QA Director Bob',
      email: 'qa.partner@example.com',
      phone: '334-555-0166',
      partnerType: 'Employer / Hiring Partner',
      proposalNotes: 'QA Automated Partner Test'
    };
    const res = await fetch(`${BASE_URL}/api/partnerships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/partnerships returns 200 with success status', res.status === 200 && body.success === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/partnerships call succeeded', false, { error: err.message });
  }

  // Test 5.5: Donation Pledges (/api/donations)
  try {
    const payload = {
      donorName: 'QA Generous Donor',
      donorEmail: 'qa.donor@example.com',
      donorPhone: '334-555-0155',
      pledgeAmount: '250',
      pledgeType: 'One-Time General Fund',
      message: 'QA Automated Donation Pledge'
    };
    const res = await fetch(`${BASE_URL}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/donations returns 200 with success status', res.status === 200 && body.success === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/donations call succeeded', false, { error: err.message });
  }

  // Test 5.6: Analytics Tracking Event (/api/analytics/event)
  try {
    const payload = {
      event: 'cta_click',
      category: 'engagement',
      label: 'Hero Apply CTA',
      timestamp: new Date().toISOString()
    };
    const res = await fetch(`${BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    s5.assert('POST /api/analytics/event records event successfully', res.status === 200 && body.recorded === true, { status: res.status, body });
  } catch (err) {
    s5.assert('POST /api/analytics/event call succeeded', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // SUITE 6: API Validation & Error Handling (Negative Testing)
  // -------------------------------------------------------------
  const s6 = recordSuite('6. Form Validation & Bad Input Defense');

  // Negative 6.1: Candidate missing required name
  try {
    const res = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateEmail: 'test@example.com', candidatePhone: '334-555-1234' })
    });
    const body = await res.json();
    s6.assert('POST /api/candidates rejects missing name with 400', res.status === 400 && Boolean(body.error), { status: res.status, body });
  } catch (err) {
    s6.assert('Negative test 6.1 executed', false, { error: err.message });
  }

  // Negative 6.2: Invalid email format
  try {
    const res = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateName: 'Test Name', candidateEmail: 'invalid-email-address', candidatePhone: '334-555-1234' })
    });
    const body = await res.json();
    s6.assert('POST /api/candidates rejects malformed email with 400', res.status === 400 && Boolean(body.error), { status: res.status, body });
  } catch (err) {
    s6.assert('Negative test 6.2 executed', false, { error: err.message });
  }

  // Negative 6.3: Honeypot bot deflection
  try {
    const res = await fetch(`${BASE_URL}/api/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateName: 'Spam Bot',
        candidateEmail: 'bot@spam.com',
        candidatePhone: '334-555-0000',
        website: 'http://spam-link.ru', // honeypot trap field
        companyUrl: 'http://spam.com'
      })
    });
    const body = await res.json();
    // Honeypot should deflect silently with 200 without writing to database
    s6.assert('POST /api/candidates deflects honeypot trap with silent 200', res.status === 200 && body.deflected === true, { status: res.status, body });
  } catch (err) {
    s6.assert('Negative test 6.3 executed', false, { error: err.message });
  }

  // -------------------------------------------------------------
  // SUITE 7: Accessibility & Keyboard Navigation Attributes
  // -------------------------------------------------------------
  const s7 = recordSuite('7. Accessibility & Semantic Structure');

  // Verify skip-to-content link exists in all main pages
  for (const page of ['index.html', 'train.html', 'eligibility.html', 'volunteer.html', 'partner.html', 'donate.html']) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const hasSkipLink = html.includes('class="skip-link"') || html.includes("class='skip-link'") || html.includes('href="#main-content"');
    const hasMainContent = html.includes('id="main-content"');
    s7.assert(`${page} has accessible skip link to #main-content`, hasSkipLink && hasMainContent, { hasSkipLink, hasMainContent });
  }

  // Verify FAQ accordion accessibility: <details> with <summary>
  const detailsCount = (indexHtml.match(/<details/g) || []).length;
  const summaryCount = (indexHtml.match(/<summary/g) || []).length;
  s7.assert('FAQ section uses accessible <details> and <summary> markup', detailsCount > 0 && detailsCount === summaryCount, { detailsCount, summaryCount });

  // Verify viewport meta tag exists
  s7.assert('Responsive viewport meta tag configured with width=device-width', indexHtml.includes('name="viewport"') && indexHtml.includes('width=device-width'));

  // -------------------------------------------------------------
  // Summary Calculation
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`QA AUDIT COMPLETE: ${results.passed}/${results.total} CHECKS PASSED`);
  if (results.failed === 0) {
    console.log('🎉 ALL FUNCTIONAL QA CHECKS PASSED WITH ZERO DEFECTS!');
  } else {
    console.error(`⚠️ ${results.failed} CHECKS FAILED - REVIEW LOGS ABOVE`);
  }
  console.log('================================================================\n');

  // Save report to disk
  fs.writeFileSync(path.join(ROOT, 'qa-audit-report.json'), JSON.stringify(results, null, 2), 'utf8');
  process.exit(results.failed > 0 ? 1 : 0);
}

runQA().catch((err) => {
  console.error('Fatal QA Runner Error:', err);
  process.exit(1);
});
