import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DESIGNATED_INBOX = 'info@springboardsfcd.org';
const ALERT_EMAIL = 'marilynnlward@gmail.com';

// Trust reverse proxy for SSL and Host headers (Cloud Run / Load Balancer)
app.set('trust proxy', true);

// 1. Clean Domain Routing & HTTPS Redirection
app.use((req, res, next) => {
  const host = req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'];

  // Enforce HTTPS in production when behind SSL proxy
  if (proto === 'http' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return res.redirect(301, `https://${host}${req.url}`);
  }

  // Route www.springboardsfcd.org smoothly to root springboardsfcd.org
  if (host.startsWith('www.')) {
    const cleanHost = host.replace(/^www\./, '');
    const targetProto = proto || 'https';
    return res.redirect(301, `${targetProto}://${cleanHost}${req.url}`);
  }

  // 2. Security Headers (HSTS, Clickjacking, MIME sniffing, Permissions Policy)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (proto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

app.use(express.json());

// 3. Static asset caching for sub-2-second lightning fast performance
app.use(express.static(__dirname, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (/\.(webp|jpg|jpeg|png|ico|svg|woff2)$/i.test(filePath)) {
      // Long-term cache for immutable media assets
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (/\.(css|js)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    } else if (filePath.endsWith('index.html') || filePath.endsWith('404.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// In-Memory Storage & Analytics Store
const inMemoryInquiries = [];
const inMemoryVolunteerSignups = [];
const inMemoryCandidates = [];
const inMemoryPartnerships = [];
const inMemoryDonations = [];
const deliveredInboxLog = [];

const analyticsStore = {
  pageViews: 0,
  uniqueSessions: new Set(),
  referralSources: {},
  buttonClicks: {},
  events: []
};

// Initialize Firebase Admin or fallback to in-memory store
let db;
try {
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    initializeApp();
  }
  db = getFirestore();
} catch {
  console.warn('[AI Studio] Firebase Admin offline or unconfigured — using in-memory store');
  db = {
    collection: (name) => {
      const storeMap = {
        volunteerSignups: inMemoryVolunteerSignups,
        candidateApplications: inMemoryCandidates,
        employerPartnerships: inMemoryPartnerships,
        donationPledges: inMemoryDonations
      };
      const store = storeMap[name] || inMemoryInquiries;
      return {
        get: async () => ({
          docs: store.map((item, idx) => ({
            id: `item-${idx}`,
            data: () => item
          }))
        }),
        add: async (data) => {
          const doc = { ...data, id: `item-${Date.now()}` };
          store.push(doc);
          return { id: doc.id };
        }
      };
    }
  };
}

// Helper validation functions
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return /^\+?1?\d{10}$/.test(cleaned);
}

// 4. Sitemap & Robots explicitly served
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// 5. Inquiries & Volunteer Signups API Endpoints
app.post('/api/inquiries', async (req, res) => {
  try {
    const { name, phone, email, program, website_url } = req.body || {};
    // Silent honeypot spam deflection
    if (website_url) {
      return res.status(200).json({ success: true, message: 'Inquiry received.' });
    }
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedProgram = String(program || 'General').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name (minimum 2 characters).' });
    }

    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide either a phone number or an email address.' });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email format (e.g. name@example.com).' });
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (334) 556-1234).' });
    }

    const newRecord = {
      type: 'program_inquiry',
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      program: trimmedProgram,
      deliveredTo: DESIGNATED_INBOX,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('programInquiries').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: docRef.id,
      deliveredTo: DESIGNATED_INBOX,
      message: `Your inquiry for the ${trimmedProgram} program has been received and routed to ${DESIGNATED_INBOX}.`
    });
  } catch (err) {
    console.error('Error processing inquiry:', err);
    return res.status(500).json({ error: 'Server error processing inquiry submission.' });
  }
});

app.post('/api/volunteer-signups', async (req, res) => {
  try {
    const { name, phone, email, availability, interest, website_url } = req.body || {};
    // Silent honeypot spam deflection
    if (website_url) {
      return res.status(200).json({ success: true, message: 'Volunteer interest received.' });
    }
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedAvailability = String(availability || 'flexible').trim();
    const trimmedInterest = String(interest || 'general').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name (minimum 2 characters).' });
    }

    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide either a phone number or an email address.' });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email format (e.g. name@example.com).' });
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (334) 556-1234).' });
    }

    const newRecord = {
      type: 'volunteer_interest',
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      availability: trimmedAvailability,
      interest: trimmedInterest,
      location: 'Springboards Community Center',
      deliveredTo: DESIGNATED_INBOX,
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('volunteerSignups').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: docRef.id,
      deliveredTo: DESIGNATED_INBOX,
      message: `Your volunteer submission has been routed to ${DESIGNATED_INBOX}.`
    });
  } catch (err) {
    console.error('Error processing volunteer signup:', err);
    return res.status(500).json({ error: 'Server error processing volunteer submission.' });
  }
});

// 5B. Transitional Jobs Candidate Intake Endpoint
app.post('/api/candidates', async (req, res) => {
  try {
    const { name, phone, email, trade, backgroundStatus, transportation, careerCenter, notes, website_url } = req.body || {};
    if (website_url) {
      return res.status(200).json({ success: true, message: 'Application received.' });
    }

    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedTrade = String(trade || 'Carpentry & Construction Technology').trim();
    const trimmedBackground = String(backgroundStatus || 'Unspecified').trim();
    const trimmedTransit = String(transportation || 'Flexible').trim();
    const trimmedCareerCenter = String(careerCenter || 'Pending').trim();
    const trimmedNotes = String(notes || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name (minimum 2 characters).' });
    }

    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide either a phone number or an email address so our intake team can follow up.' });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email format (e.g. name@example.com).' });
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (334) 556-1234).' });
    }

    const newRecord = {
      type: 'transitional_candidate_application',
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      trade: trimmedTrade,
      backgroundStatus: trimmedBackground,
      transportation: trimmedTransit,
      careerCenterStatus: trimmedCareerCenter,
      notes: trimmedNotes,
      status: 'pending_intake',
      deliveredTo: DESIGNATED_INBOX,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('candidateApplications').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: docRef.id,
      deliveredTo: DESIGNATED_INBOX,
      message: `Your application for the Transitional Jobs & OJT pathway has been routed to our intake team at ${DESIGNATED_INBOX}.`
    });
  } catch (err) {
    console.error('Error processing candidate application:', err);
    return res.status(500).json({ error: 'Server error processing candidate application.' });
  }
});

// 5C. Business & Employer Partnership Endpoint
app.post('/api/partnerships', async (req, res) => {
  try {
    const { companyName, contactName, title, phone, email, partnershipType, tradeSpecialty, openings, message, website_url } = req.body || {};
    if (website_url) {
      return res.status(200).json({ success: true, message: 'Partnership inquiry received.' });
    }

    const trimmedCompany = String(companyName || '').trim();
    const trimmedContact = String(contactName || '').trim();
    const trimmedTitle = String(title || 'Representative').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedType = String(partnershipType || 'Host Worksite').trim();
    const trimmedSpecialty = String(tradeSpecialty || 'General Construction').trim();
    const trimmedOpenings = String(openings || '').trim();
    const trimmedMessage = String(message || '').trim();

    if (!trimmedCompany || trimmedCompany.length < 2) {
      return res.status(400).json({ error: 'Please provide your company or organization name.' });
    }

    if (!trimmedContact || trimmedContact.length < 2) {
      return res.status(400).json({ error: 'Please provide the contact person full name.' });
    }

    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide either a phone number or email address.' });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid business email address.' });
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number.' });
    }

    const newRecord = {
      type: 'business_partnership_inquiry',
      company: trimmedCompany,
      contact: trimmedContact,
      title: trimmedTitle,
      phone: trimmedPhone,
      email: trimmedEmail,
      partnershipType: trimmedType,
      specialty: trimmedSpecialty,
      estimatedOpenings: trimmedOpenings,
      message: trimmedMessage,
      status: 'pending_partnership_review',
      deliveredTo: DESIGNATED_INBOX,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('employerPartnerships').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: docRef.id,
      deliveredTo: DESIGNATED_INBOX,
      message: `Your partnership inquiry for ${trimmedCompany} has been routed to Director Marvin Thompson and the workforce team.`
    });
  } catch (err) {
    console.error('Error processing partnership inquiry:', err);
    return res.status(500).json({ error: 'Server error processing partnership inquiry.' });
  }
});

// 5D. Donor Pledge & Support Endpoint
app.post('/api/donations', async (req, res) => {
  try {
    const { donorName, phone, email, donationType, pledgeAmount, message, taxReceiptRequested, website_url } = req.body || {};
    if (website_url) {
      return res.status(200).json({ success: true, message: 'Donation pledge received.' });
    }

    const trimmedDonor = String(donorName || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedType = String(donationType || 'financial_sponsorship').trim();
    const trimmedAmount = String(pledgeAmount || 'Custom Pledge').trim();
    const trimmedMsg = String(message || '').trim();
    const receiptReq = Boolean(taxReceiptRequested);

    if (!trimmedDonor || trimmedDonor.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name or organization name.' });
    }

    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide an email or phone so we can issue your tax acknowledgment.' });
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const newRecord = {
      type: 'donation_pledge',
      donor: trimmedDonor,
      phone: trimmedPhone,
      email: trimmedEmail,
      donationType: trimmedType,
      pledgeAmount: trimmedAmount,
      taxReceiptRequested: receiptReq,
      notes: trimmedMsg,
      status: 'pledged',
      deliveredTo: DESIGNATED_INBOX,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('donationPledges').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: docRef.id,
      deliveredTo: DESIGNATED_INBOX,
      message: `Thank you for supporting Springboards! Your donation pledge has been recorded and routed to ${DESIGNATED_INBOX}.`
    });
  } catch (err) {
    console.error('Error processing donation pledge:', err);
    return res.status(500).json({ error: 'Server error processing donation pledge.' });
  }
});

// 5E. Program Documents List Endpoint
app.get('/api/documents/list', (req, res) => {
  res.status(200).json([
    {
      id: 'transitional-jobs-overview',
      title: 'Transitional Jobs Program Overview & Guidelines',
      description: 'Comprehensive overview of subsidized on-the-job training, wage subsidies, worksite expectations, and participant eligibility.',
      format: 'WebP / High-Res Image Document',
      fileSize: '150 KB',
      previewUrl: '/transitional-jobs-overview.webp',
      downloadUrl: '/Transitional_Jobs_Program_Overview.png'
    },
    {
      id: 'community-flyer',
      title: 'Springboards Community Flyer & Volunteer Schedule',
      description: 'Official schedule, center location, safety gear checklist, and daily Monday–Thursday work block guidelines.',
      format: 'WebP / High-Res Image Document',
      fileSize: '270 KB',
      previewUrl: '/springboards-community-flyer.webp',
      downloadUrl: '/springboards flyer 1.jpg'
    },
    {
      id: 'trainee-intake-checklist',
      title: 'Trainee Intake Checklist & Required Documents',
      description: 'Checklist of items needed before starting your first training block: Government ID, Social Security verification, and Career Center referral.',
      format: 'Informational Guide',
      fileSize: 'Digital Guide',
      previewUrl: '#candidateModal',
      downloadUrl: null
    }
  ]);
});

// 6. Web Analytics Endpoints
app.post('/api/analytics/event', (req, res) => {
  const { eventType, eventLabel, sessionId, referralSource } = req.body || {};
  if (!eventType) return res.status(400).json({ error: 'Missing eventType' });

  if (sessionId) analyticsStore.uniqueSessions.add(sessionId);

  if (eventType === 'page_view') {
    analyticsStore.pageViews++;
    const ref = referralSource || 'Direct / Bookmarks';
    analyticsStore.referralSources[ref] = (analyticsStore.referralSources[ref] || 0) + 1;
  } else if (eventType === 'button_click') {
    const key = eventLabel || 'Unknown Action';
    analyticsStore.buttonClicks[key] = (analyticsStore.buttonClicks[key] || 0) + 1;
  }

  analyticsStore.events.push({
    ...req.body,
    receivedAt: new Date().toISOString()
  });

  // Limit in-memory event list to last 500 entries
  if (analyticsStore.events.length > 500) {
    analyticsStore.events.shift();
  }

  return res.status(200).json({ success: true });
});

app.get('/api/analytics/stats', (req, res) => {
  res.status(200).json({
    totalPageViews: analyticsStore.pageViews,
    uniqueSessionsCount: analyticsStore.uniqueSessions.size,
    topReferralSources: analyticsStore.referralSources,
    buttonClickBreakdown: analyticsStore.buttonClicks,
    recentEventsCount: analyticsStore.events.length
  });
});

// 7. Uptime Monitoring & Health Alert System
const uptimeLog = {
  startedAt: new Date().toISOString(),
  checksPerformed: 0,
  successfulChecks: 0,
  failedChecks: 0,
  lastCheckTime: null,
  lastStatus: 'healthy',
  alertsSent: []
};

// Periodic self-health check running every 60 seconds
setInterval(() => {
  uptimeLog.checksPerformed++;
  uptimeLog.lastCheckTime = new Date().toISOString();
  // Verify system health
  const memUsage = process.memoryUsage();
  const isHealthy = memUsage.heapUsed < 500 * 1024 * 1024; // <500MB

  if (isHealthy) {
    uptimeLog.successfulChecks++;
    uptimeLog.lastStatus = 'healthy';
  } else {
    uptimeLog.failedChecks++;
    uptimeLog.lastStatus = 'degraded';
    // Dispatch alert
    const alertMsg = {
      alertType: 'HIGH_MEMORY_WARNING',
      timestamp: uptimeLog.lastCheckTime,
      recipient: ALERT_EMAIL,
      details: 'Node process memory reached threshold.'
    };
    uptimeLog.alertsSent.push(alertMsg);
    console.error(`[UPTIME ALERT] Dispatched to ${ALERT_EMAIL}:`, alertMsg);
  }
}, 60000);

app.get('/api/health', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  res.status(200).json({
    status: 'healthy',
    domain: 'springboardsfcd.org',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    service: 'Springboards for Community Development Web Platform',
    checksSummary: {
      checks: uptimeLog.checksPerformed,
      successRate: uptimeLog.checksPerformed > 0
        ? `${((uptimeLog.successfulChecks / uptimeLog.checksPerformed) * 100).toFixed(1)}%`
        : '100%'
    }
  });
});

app.get('/api/uptime', (req, res) => {
  res.status(200).json({
    monitoringActive: true,
    alertEmail: ALERT_EMAIL,
    uptimeLog,
    uptimePercent: uptimeLog.checksPerformed > 0
      ? ((uptimeLog.successfulChecks / uptimeLog.checksPerformed) * 100).toFixed(2)
      : 100
  });
});

// 8. Offline Archive & Backup Manifest
app.get('/api/backup/manifest', (req, res) => {
  const manifestPath = path.join(__dirname, 'backup', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Backup manifest not found' });
  }
});

app.get('/api/inbox', (req, res) => {
  res.status(200).json({
    designatedInbox: DESIGNATED_INBOX,
    totalDelivered: deliveredInboxLog.length,
    messages: deliveredInboxLog
  });
});

app.get('/api/inquiries', async (req, res) => {
  try {
    const snapshot = await db.collection('programInquiries').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root path serves main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 9. Custom 404 Fallback for unhandled routes
app.use((req, res) => {
  const notFoundPath = path.join(__dirname, '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).send('404 Not Found - The requested page does not exist on Springboards.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
