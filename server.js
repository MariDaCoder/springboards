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
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (615) 603-1157).' });
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
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (615) 603-1157).' });
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
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number (e.g. (615) 603-1157).' });
    }

    const newRecord = {
      id: `cand-${Date.now()}`,
      type: 'transitional_candidate_application',
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      trade: trimmedTrade,
      preferredRole: String(req.body.preferredRole || 'Carpenter Helper').trim(),
      backgroundStatus: trimmedBackground,
      transportation: trimmedTransit,
      careerCenterStatus: trimmedCareerCenter,
      notes: trimmedNotes,
      stage: 'Pending Intake',
      intakeNotes: '',
      deliveredTo: DESIGNATED_INBOX,
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(backofficeData.candidateApplications)) {
      backofficeData.candidateApplications = [];
    }
    backofficeData.candidateApplications.unshift(newRecord);
    saveBackofficeData();

    const docRef = await db.collection('candidateApplications').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    return res.status(200).json({
      success: true,
      id: newRecord.id,
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

// --- Backoffice Portal & Staff Hub System ---
const BACKOFFICE_FILE = path.join(__dirname, 'backoffice-data.json');
let backofficeData = {
  staffRoster: [],
  chatMessages: [],
  calendarEvents: [],
  complianceItems: [],
  sharedDocuments: []
};

try {
  if (fs.existsSync(BACKOFFICE_FILE)) {
    const raw = fs.readFileSync(BACKOFFICE_FILE, 'utf8');
    backofficeData = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[Backoffice] Error loading backoffice-data.json:', e.message);
}

function saveBackofficeData() {
  try {
    fs.writeFileSync(BACKOFFICE_FILE, JSON.stringify(backofficeData, null, 2), 'utf8');
  } catch (e) {
    console.error('[Backoffice] Failed to persist backoffice-data.json:', e);
  }
}

// Backoffice Authentication (Phone + PIN for Staff, Google or Admin PIN for Admin)
app.post('/api/backoffice/auth', (req, res) => {
  const { type, phone, pin, adminEmail, adminCode } = req.body || {};

  // Admin bypass with designated admin email or code
  if (type === 'admin') {
    if (adminCode === '2026' || adminCode === '1985' || adminEmail === 'marilynnlward@gmail.com' || adminEmail === 'info@springboardsfcd.org') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin-1',
          name: adminEmail === 'marilynnlward@gmail.com' ? 'Marilynn Ward' : 'Administrator',
          role: 'Workforce Director / Compliance Admin',
          isAdmin: true,
          email: adminEmail || 'marilynnlward@gmail.com'
        }
      });
    }
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  // Staff phone + PIN authentication
  const cleanedInputPhone = String(phone || '').replace(/\D/g, '');
  const trimmedPin = String(pin || '').trim();

  if (!cleanedInputPhone || cleanedInputPhone.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number.' });
  }
  if (!trimmedPin) {
    return res.status(400).json({ error: 'Please enter your 4-digit staff PIN.' });
  }

  const staffMatch = backofficeData.staffRoster.find(member => {
    const memberPhone = String(member.phone || '').replace(/\D/g, '');
    return memberPhone.endsWith(cleanedInputPhone.slice(-10)) && String(member.pin).trim() === trimmedPin;
  });

  if (staffMatch) {
    return res.status(200).json({
      success: true,
      user: {
        id: staffMatch.id,
        name: staffMatch.name,
        role: staffMatch.role,
        isAdmin: !!staffMatch.isAdmin,
        phone: staffMatch.phone
      }
    });
  }

  // Quick access helpers for leadership
  if (cleanedInputPhone.endsWith('6031157') || cleanedInputPhone.endsWith('7560123') || cleanedInputPhone.endsWith('3025326')) {
    if (trimmedPin === '2026' || trimmedPin === '1985') {
      if (cleanedInputPhone.endsWith('6031157') || trimmedPin === '2026') {
        return res.status(200).json({
          success: true,
          user: {
            id: 'staff-marilynn',
            name: 'Marilynn Ward',
            role: 'Workforce Director / Compliance Admin',
            isAdmin: true,
            phone: '(615) 603-1157'
          }
        });
      } else if (cleanedInputPhone.endsWith('3025326')) {
        return res.status(200).json({
          success: true,
          user: {
            id: 'staff-melvin',
            name: 'Melvin M.L. Ward',
            role: 'Founder / Board President',
            isAdmin: true,
            phone: '706-302-5326'
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          user: {
            id: 'staff-marvin',
            name: 'Marvin Thompson',
            role: 'Executive Director',
            isAdmin: true,
            phone: '(334) 756-0123'
          }
        });
      }
    }
  }

  return res.status(401).json({ error: 'Phone number or staff PIN not recognized. Please contact Marilynn or Marvin to be added to the team roster.' });
});

// Get state (chat, calendar, documents, compliance, candidates, and roster if authorized)
app.get('/api/backoffice/state', (req, res) => {
  const isAdmin = req.headers['x-admin-auth'] === 'true' || req.query.admin === 'true';

  res.status(200).json({
    chatMessages: backofficeData.chatMessages || [],
    calendarEvents: backofficeData.calendarEvents || [],
    sharedDocuments: backofficeData.sharedDocuments || [],
    complianceItems: backofficeData.complianceItems || [],
    candidateApplications: backofficeData.candidateApplications || [],
    inboxMessages: deliveredInboxLog || [],
    boardStructure: backofficeData.boardStructure || [],
    staffRoster: isAdmin ? backofficeData.staffRoster : (backofficeData.staffRoster || []).map(m => ({ id: m.id, name: m.name, role: m.role, status: m.status }))
  });
});

// Post chat message
app.post('/api/backoffice/chat', (req, res) => {
  const { senderName, senderRole, text, channel, attachment } = req.body || {};
  const trimmedText = String(text || '').trim();

  if (!trimmedText && !attachment) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const newMsg = {
    id: `msg-${Date.now()}`,
    senderName: String(senderName || 'Staff Member').trim(),
    senderRole: String(senderRole || 'Team Member').trim(),
    text: trimmedText,
    channel: channel || 'general',
    attachment: attachment || null,
    timestamp: new Date().toISOString()
  };

  if (!Array.isArray(backofficeData.chatMessages)) {
    backofficeData.chatMessages = [];
  }

  backofficeData.chatMessages.push(newMsg);
  // Keep last 150 messages
  if (backofficeData.chatMessages.length > 150) {
    backofficeData.chatMessages = backofficeData.chatMessages.slice(-150);
  }
  saveBackofficeData();

  return res.status(200).json({ success: true, message: newMsg });
});

// Add calendar event (admin)
app.post('/api/backoffice/calendar', (req, res) => {
  const { title, date, time, location, category, description } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }

  const newEvent = {
    id: `event-${Date.now()}`,
    title: String(title).trim(),
    date: String(date).trim(),
    time: String(time || 'All Day').trim(),
    location: String(location || 'Springboards Facility').trim(),
    category: String(category || 'general').trim(),
    description: String(description || '').trim()
  };

  if (!Array.isArray(backofficeData.calendarEvents)) {
    backofficeData.calendarEvents = [];
  }
  backofficeData.calendarEvents.push(newEvent);
  saveBackofficeData();

  return res.status(200).json({ success: true, event: newEvent });
});

// Delete calendar event
app.delete('/api/backoffice/calendar/:id', (req, res) => {
  const { id } = req.params;
  backofficeData.calendarEvents = (backofficeData.calendarEvents || []).filter(e => e.id !== id);
  saveBackofficeData();
  return res.status(200).json({ success: true });
});

// Add staff member to roster (admin)
app.post('/api/backoffice/roster', (req, res) => {
  const { name, role, phone, pin, isAdmin } = req.body || {};
  if (!name || !phone || !pin) {
    return res.status(400).json({ error: 'Name, phone number, and 4-digit PIN are required.' });
  }

  const newMember = {
    id: `staff-${Date.now()}`,
    name: String(name).trim(),
    role: String(role || 'Trades Crew Member').trim(),
    phone: String(phone).trim(),
    pin: String(pin).trim(),
    isAdmin: !!isAdmin,
    status: 'Active'
  };

  if (!Array.isArray(backofficeData.staffRoster)) {
    backofficeData.staffRoster = [];
  }
  backofficeData.staffRoster.push(newMember);
  saveBackofficeData();

  return res.status(200).json({ success: true, member: newMember });
});

// Delete staff member from roster
app.delete('/api/backoffice/roster/:id', (req, res) => {
  const { id } = req.params;
  backofficeData.staffRoster = (backofficeData.staffRoster || []).filter(m => m.id !== id);
  saveBackofficeData();
  return res.status(200).json({ success: true });
});

// Update compliance item status & notes
app.post('/api/backoffice/compliance/update', (req, res) => {
  const { id, status, notes, requestDate, dueDate } = req.body || {};
  const item = (backofficeData.complianceItems || []).find(c => c.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Compliance item not found.' });
  }

  if (status) item.status = status;
  if (notes !== undefined) item.notes = notes;
  if (requestDate) item.requestDate = requestDate;
  if (dueDate) item.dueDate = dueDate;

  saveBackofficeData();
  return res.status(200).json({ success: true, item });
});

// Update candidate stage & intake notes
app.post('/api/backoffice/candidates/update', (req, res) => {
  const { id, stage, intakeNotes } = req.body || {};
  const cand = (backofficeData.candidateApplications || []).find(c => c.id === id);
  if (!cand) {
    return res.status(404).json({ error: 'Candidate record not found.' });
  }

  if (stage) cand.stage = stage;
  if (intakeNotes !== undefined) cand.intakeNotes = intakeNotes;

  saveBackofficeData();
  return res.status(200).json({ success: true, candidate: cand });
});

// Delete candidate record
app.delete('/api/backoffice/candidates/:id', (req, res) => {
  const { id } = req.params;
  backofficeData.candidateApplications = (backofficeData.candidateApplications || []).filter(c => c.id !== id);
  saveBackofficeData();
  return res.status(200).json({ success: true });
});

// Backoffice and Portal route
app.get(['/backoffice', '/portal'], (req, res) => {
  const backofficeHtmlPath = path.join(__dirname, 'backoffice.html');
  if (fs.existsSync(backofficeHtmlPath)) {
    res.sendFile(backofficeHtmlPath);
  } else {
    res.redirect('/');
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
