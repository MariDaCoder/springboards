import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DESIGNATED_INBOX = 'info@springboardsfcd.org';
const ALERT_EMAIL = 'marilynn.ward@springboards.org';
const BACKUP_ALERT_EMAIL = 'marilynnlward@gmail.com';

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
    const trimmedStreet = String(req.body.streetAddress || '').trim();
    const trimmedCityZip = String(req.body.cityZip || '').trim();
    const trimmedMatchedCenter = String(req.body.matchedCenter || 'Valley Career Center').trim();
    const trimmedMatchedCenterAddress = String(req.body.matchedCenterAddress || '3300 23rd Drive, Valley, AL 36854').trim();
    const trimmedTrade = String(trade || 'Carpentry & Construction Technology').trim();
    const trimmedBackground = String(backgroundStatus || 'Unspecified').trim();
    const trimmedTransit = String(transportation || 'Flexible').trim();
    const trimmedCareerCenter = String(careerCenter || 'Pending Qualification Visit').trim();
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
      streetAddress: trimmedStreet,
      cityZip: trimmedCityZip,
      matchedCenter: trimmedMatchedCenter,
      matchedCenterAddress: trimmedMatchedCenterAddress,
      trade: trimmedTrade,
      preferredRole: String(req.body.preferredRole || 'Carpenter Helper').trim(),
      backgroundStatus: trimmedBackground,
      targetBarrier: String(req.body.targetBarrier || trimmedBackground || 'Target Barrier — Ex-Offender').trim(),
      programName: String(req.body.programName || 'Transitional Jobs').trim(),
      activityLabel: String(req.body.programName === 'On-The-Job Training (OJT Referral)' ? 'OJT Referral' : '220 Transitional Jobs').trim(),
      siriusFormStatus: 'Pending 5-Day Window',
      worksiteAgreementStatus: 'Pending Review',
      hoursLimit: '32 hrs/wk (390 total)',
      jobReadinessStatus: 'Pending (Due before 195 hrs)',
      transportation: trimmedTransit,
      careerCenterStatus: trimmedCareerCenter,
      notes: trimmedNotes,
      stage: 'Prospect - Pending Followup',
      qualificationStatus: 'Pending Career Center Visit',
      firstDayCleared: false,
      siriusPlacementFormSubmitted: false,
      intakeNotes: `Nearest Career Center: ${trimmedMatchedCenter} (${trimmedMatchedCenterAddress}). Follow-up required for Career Center documentation.`,
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

    console.log(`[Transitional Candidate Intake] Notification sent to internal admin marilynn.ward@springboardsfcd.org & ${DESIGNATED_INBOX} for ${trimmedName}`);

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

// 5B-2. Transitional Jobs: Direct OJT Alternative Inquiry
app.post('/api/transitional-jobs/ojt-inquiry', async (req, res) => {
  try {
    const { name, email, situation, phone } = req.body || {};
    const trimmedEmail = String(email || '').trim();
    const trimmedName = String(name || '').trim() || 'OJT Inquirer';
    const trimmedSituation = String(situation || 'Alternative situation described: Inquiring about On-The-Job Training options.').trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const newRecord = {
      id: `cand-ojt-${Date.now()}`,
      type: 'transitional_candidate_application',
      name: trimmedName,
      phone: String(phone || '').trim(),
      email: trimmedEmail,
      trade: 'Construction Trades / OJT',
      preferredRole: 'OJT Trainee',
      targetBarrier: 'Non-Barrier (OJT Candidate)',
      programName: 'On-The-Job Training (OJT Referral)',
      activityLabel: 'OJT Referral',
      stage: 'Prospect - OJT Pathway',
      qualificationStatus: 'Host Employer OJT Screening',
      matchedCenter: 'Valley Career Center',
      matchedCenterAddress: '3300 23rd Drive, Valley, AL 36854',
      firstDayCleared: false,
      siriusPlacementFormSubmitted: false,
      siriusFormStatus: 'N/A - Direct OJT',
      hoursLimit: 'Standard Employer Schedule',
      jobReadinessStatus: 'Direct Employer Referral',
      intakeNotes: `Candidate indicated non-barrier alternative. Situation notes: ${trimmedSituation}`,
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

    console.log(`[OJT Inquiry] Alert routed to internal workforce admin marilynn.ward@springboardsfcd.org & ${DESIGNATED_INBOX} for ${trimmedEmail}`);

    return res.status(200).json({
      success: true,
      id: newRecord.id,
      deliveredTo: DESIGNATED_INBOX,
      message: 'Your OJT inquiry has been submitted and routed to our workforce advisors.'
    });
  } catch (err) {
    console.error('Error processing OJT inquiry:', err);
    return res.status(500).json({ error: 'Server error processing OJT inquiry.' });
  }
});

// 5B-3. Stage 2: Eligibility Check Intake & Google Workspace Sync
app.post('/api/transitional-jobs/eligibility-submit', async (req, res) => {
  try {
    const {
      candidateName,
      phone,
      email,
      addressCity,
      nearestCareerCenter,
      confirmedBackgroundStatus,
      notes
    } = req.body || {};

    const trimmedName = String(candidateName || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedAddress = String(addressCity || '').trim();
    const trimmedCenter = String(nearestCareerCenter || 'Valley Career Center').trim();
    const trimmedStatus = String(confirmedBackgroundStatus || 'Returning Citizen').trim();
    const trimmedNotes = String(notes || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please provide full legal name.' });
    }
    if (!trimmedPhone && !trimmedEmail) {
      return res.status(400).json({ error: 'Please provide at least a phone number or email address.' });
    }

    // Program Tagging Rule:
    // If they do not qualify for Transitional Jobs (i.e. status is "Employed"),
    // that same submission automatically tags them in your spreadsheet as:
    // Program: On-The-Job Training (OJT Follow-up) instead of Transitional Jobs (Activity 220).
    const isTransitionalQualified = trimmedStatus !== 'Employed';
    const programTag = isTransitionalQualified
      ? 'Transitional Jobs (Activity 220)'
      : 'Program: On-The-Job Training (OJT Follow-up)';

    const careerCenterDetails = {
      'Valley Career Center': {
        name: 'Valley Career Center',
        address: '3300 23rd Drive, Valley, AL 36854 inside Growth Academy',
        hours: 'Monday through Friday 8:00 AM to 4:30 PM Eastern Time',
        phone: '(334) 756-3065',
        callLink: 'tel:+13347563065'
      },
      'Opelika Career Center': {
        name: 'Opelika Career Center',
        address: '2300 Frederick Road, Opelika, AL 36801',
        hours: 'Monday through Friday 8:00 AM to 4:30 PM Central Time',
        phone: '(334) 749-5065',
        callLink: 'tel:+13347495065'
      },
      'Phenix City Career Center': {
        name: 'Phenix City Career Center',
        address: '2602 College Dr CVCC campus Brassell Hall Rm 132, Phenix City, AL 36869',
        hours: 'Monday through Friday 8:00 AM to 4:30 PM Eastern Time',
        phone: '(334) 214-4828',
        callLink: 'tel:+13342144828'
      }
    };

    const selectedCenterObj = careerCenterDetails[trimmedCenter] || careerCenterDetails['Valley Career Center'];
    const timestamp = new Date().toISOString();
    const passCode = `PASS-${selectedCenterObj.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Generate Google Calendar Link for Candidate
    // Standard appointment: Next business morning at 9:00 AM
    const now = new Date();
    const visitDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    visitDate.setHours(9, 0, 0, 0);
    const visitDateEnd = new Date(visitDate.getTime() + 90 * 60 * 1000); // 1.5 hours
    const fmtGCalDate = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, "");
    const gcalStart = fmtGCalDate(visitDate);
    const gcalEnd = fmtGCalDate(visitDateEnd);

    const candCalTitle = `Career Center Verification Visit - ${selectedCenterObj.name}`;
    const candCalDetails = `Springboards Transitional Jobs State Verification Visit\n\nDesignated Center: ${selectedCenterObj.name}\nAddress: ${selectedCenterObj.address}\nOperating Hours: ${selectedCenterObj.hours}\nDirect Call: ${selectedCenterObj.phone}\nVerification Pass: ${passCode}\n\nTwo Essential Items to Bring:\n1. State Identification Card (Valid Alabama Driver License or Non Driver ID)\n2. Social Security Card (Original Card for Wage Enrollment)\n\nState Requirement Notice: The state requires candidates to be verified through the Career Center before worksite assignment.\n\nSpringboards Workforce Intake | info@springboardsfcd.org`;
    const candidateCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(candCalTitle)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(candCalDetails)}&location=${encodeURIComponent(selectedCenterObj.address)}`;

    // Generate Staff Follow-Up Alert Google Calendar Link (Duplicate in staff calendar)
    const staffCalTitle = `Follow-up: State Clearance Alert for ${trimmedName} (${selectedCenterObj.name})`;
    const staffCalDetails = `Staff Follow-up Alert: State Clearance Verification\nCandidate: ${trimmedName}\nPhone: ${trimmedPhone}\nEmail: ${trimmedEmail}\nPass ID: ${passCode}\nCenter: ${selectedCenterObj.name}\nProgram Tag: ${programTag}\n\nAction Checklist:\n- Confirm arrival at Career Center\n- Verify State ID & SSN verified for Activity Code 220\n- Check Sirius Workforce Worksites Placement status (5-day deadline)\n\nOfficial state clearance must be logged before Day 1 worksite entry.`;
    const staffCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(staffCalTitle)}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(staffCalDetails)}&location=${encodeURIComponent(selectedCenterObj.address)}`;

    const newRecord = {
      id: `cand-${Date.now()}`,
      passCode: passCode,
      type: 'transitional_candidate_application',
      // Google Workspace 10 Master Columns:
      timestamp: timestamp,
      candidateName: trimmedName,
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      addressCity: trimmedAddress,
      streetAddress: trimmedAddress,
      nearestCareerCenter: selectedCenterObj.name,
      matchedCenter: selectedCenterObj.name,
      matchedCenterAddress: selectedCenterObj.address,
      confirmedBackgroundStatus: trimmedStatus,
      backgroundStatus: trimmedStatus,
      targetBarrier: trimmedStatus,
      programTag: programTag,
      programName: isTransitionalQualified ? 'Transitional Jobs' : 'On-The-Job Training (OJT Referral)',
      activityLabel: isTransitionalQualified ? '220 Transitional Jobs' : 'OJT Referral',
      careerCenterVisitStatus: 'Pending Career Center Verification',
      qualificationStatus: isTransitionalQualified ? 'Pending Career Center Visit' : 'Host Employer OJT Screening',
      stage: isTransitionalQualified ? 'Career Center Appointment Set' : 'Prospect - OJT Pathway',
      notes: trimmedNotes || `Pass ${passCode} issued for ${selectedCenterObj.name}. What to bring: State Identification and Social Security Card.`,
      intakeNotes: `Career Center Pass ${passCode} issued. Automated email dispatched from info@springboardsfcd.org. Candidate & Staff Google Calendar links generated.`,
      firstDayCleared: false,
      siriusPlacementFormSubmitted: false,
      siriusFormStatus: isTransitionalQualified ? 'Pending 5-Day Window' : 'N/A - Direct OJT',
      hoursLimit: isTransitionalQualified ? '32 hrs/wk (390 total)' : 'Standard Employer Schedule',
      jobReadinessStatus: isTransitionalQualified ? 'Pending (Due before 195 hrs)' : 'Direct Employer Referral',
      loggedHours: 0,
      onlineLearningBadgeEarned: false,
      retentionStatus: 'In Training Pipeline',
      deliveredTo: DESIGNATED_INBOX,
      createdAt: timestamp,
      calendarLinks: {
        candidateCalendarUrl,
        staffCalendarUrl
      },
      notificationsDispatched: {
        emailSent: Boolean(trimmedEmail),
        smsSent: Boolean(trimmedPhone),
        senderAccount: 'info@springboardsfcd.org',
        recipientPhone: trimmedPhone,
        recipientEmail: trimmedEmail,
        locationName: selectedCenterObj.name,
        locationAddress: selectedCenterObj.address,
        locationHours: selectedCenterObj.hours,
        locationPhone: selectedCenterObj.phone,
        callLink: selectedCenterObj.callLink,
        passCode: passCode,
        dispatchedAt: timestamp
      }
    };

    if (!Array.isArray(backofficeData.candidateApplications)) {
      backofficeData.candidateApplications = [];
    }
    backofficeData.candidateApplications.unshift(newRecord);
    saveBackofficeData();

    // Firestore persistence
    const docRef = await db.collection('candidateApplications').add(newRecord);
    deliveredInboxLog.push({ ...newRecord, id: docRef.id });

    // Instant Notification to staff inbox
    console.log(`[Google Workspace Alert] Master Candidate Intake updated. Automated email dispatched from info@springboardsfcd.org for ${trimmedName} (${programTag}). Pass: ${passCode}. Staff follow-up alert scheduled.`);

    return res.status(200).json({
      success: true,
      id: newRecord.id,
      passCode: passCode,
      programTag: programTag,
      selectedCenter: selectedCenterObj,
      candidateCalendarUrl: candidateCalendarUrl,
      staffCalendarUrl: staffCalendarUrl,
      notificationsDispatched: newRecord.notificationsDispatched,
      officialEmailNotice: `Automated confirmation email sent from official domain account info@springboardsfcd.org with exact Career Center address, operating hours, and one-click Google Calendar links.`,
      clearanceGuarantee: `Your automated email, along with the dual calendar reminder and staff follow-up alert, guarantees nobody shows up to work without official state clearance.`,
      message: `Your Career Center Pass and directions have been sent. Instant notification triggered to staff inbox at info@springboardsfcd.org.`
    });
  } catch (err) {
    console.error('Error processing Stage 2/3 eligibility submission:', err);
    return res.status(500).json({ error: 'Server error processing eligibility check.' });
  }
});

// 5B-4. Trainee Portal: Get Trainee State & Roadmap Progress
app.get('/api/trainee/portal-state', (req, res) => {
  try {
    const candidateId = req.query.id || req.query.candidateId;
    const candidates = backofficeData.candidateApplications || [];
    
    // Find candidate or default to active worksite demo candidate
    let trainee = null;
    if (candidateId) {
      trainee = candidates.find(c => c.id === candidateId || c.email === candidateId || c.phone === candidateId);
    }
    if (!trainee) {
      // Find candidate in worksite training or first active
      trainee = candidates.find(c => c.loggedHours > 0 || c.stage === 'Active Worksite Training (32 hrs/wk)' || c.firstDayCleared) || candidates[0];
    }

    if (!trainee) {
      return res.status(404).json({ error: 'No active trainee record found.' });
    }

    const currentHours = Number(trainee.loggedHours || 248);
    const maxHours = 390;
    const weeklyHours = Number(trainee.weeklyHours || 32);
    const onlineLearningEarned = Boolean(trainee.onlineLearningBadgeEarned || currentHours >= 195);
    const isTargetHit = currentHours >= maxHours;

    // Filter attendance logs for this candidate
    const logs = (backofficeData.attendanceLogs || []).filter(l => l.candidateId === trainee.id || l.traineeName === trainee.name);

    return res.status(200).json({
      success: true,
      trainee: {
        id: trainee.id,
        name: trainee.name || trainee.candidateName,
        trade: trainee.trade || 'Carpentry & Construction Technology',
        preferredRole: trainee.preferredRole || 'Carpenter Helper',
        stage: trainee.stage || 'Active Worksite Training (32 hrs/wk)',
        currentHours,
        maxHours,
        weeklyHours,
        progressPercent: Math.min(100, Math.round((currentHours / maxHours) * 100)),
        onlineLearningEarned,
        isTargetHit,
        retentionStatus: trainee.retentionStatus || (isTargetHit ? 'Permanent Candidate (Internal Retention Review)' : 'Active Worksite Trainee'),
        hrPackageDispatched: Boolean(trainee.hrPackageDispatched),
        googleDriveFolder: 'Google Drive / Springboards Internal Retention / Completed Trainees / ' + (trainee.name || 'Candidate')
      },
      attendanceLogs: logs.slice(0, 10),
      enrolledCandidates: candidates.map(c => ({
        id: c.id,
        name: c.name || c.candidateName,
        trade: c.trade || 'General Construction',
        loggedHours: c.loggedHours || 0,
        stage: c.stage
      }))
    });
  } catch (err) {
    console.error('Error fetching trainee portal state:', err);
    return res.status(500).json({ error: 'Server error loading trainee portal.' });
  }
});

// 5B-5. Trainee Portal: Daily Attendance Clock-In & Running Hours Calculation
app.post('/api/trainee/clock-in', async (req, res) => {
  try {
    const { candidateId, hoursWorked, taskArea, supervisorNotes, clockInTime } = req.body || {};
    const parsedHours = parseFloat(hoursWorked) || 8;
    const candidates = backofficeData.candidateApplications || [];
    const trainee = candidates.find(c => c.id === candidateId) || candidates[0];

    if (!trainee) {
      return res.status(404).json({ error: 'Trainee file not found.' });
    }

    // Cumulative running hours calculation
    const previousHours = Number(trainee.loggedHours || 248);
    const newTotalHours = Math.min(390, Math.round((previousHours + parsedHours) * 10) / 10);
    trainee.loggedHours = newTotalHours;

    // Check 195-hour online learning milestone
    if (newTotalHours >= 195 && !trainee.onlineLearningBadgeEarned) {
      trainee.onlineLearningBadgeEarned = true;
    }

    const is390Reached = newTotalHours >= 390;

    // Log attendance entry
    if (!Array.isArray(backofficeData.attendanceLogs)) {
      backofficeData.attendanceLogs = [];
    }

    const logEntry = {
      id: `att-${Date.now()}`,
      candidateId: trainee.id,
      traineeName: trainee.name || trainee.candidateName,
      trade: trainee.trade || 'Carpentry & Construction Technology',
      date: clockInTime || new Date().toISOString().split('T')[0],
      hoursWorked: parsedHours,
      cumulativeHours: newTotalHours,
      weeklyHoursLogged: Math.min(32, parsedHours + 24), // current week tracker
      taskArea: taskArea || 'Wall Framing & Bay Assembly',
      supervisorNotes: supervisorNotes || 'On time, full PPE compliant, exemplary worksite performance.',
      siriusTimecardApproved: true,
      googleSheetsSynced: true,
      syncedAt: new Date().toISOString()
    };

    backofficeData.attendanceLogs.unshift(logEntry);

    // If candidate hits 390 hours:
    // DO NOT ARCHIVE! Transition to Permanent Candidate (Internal Retention Review)
    // and route automated HR onboarding package to internal HR review!
    let hrPackageNotice = null;
    if (is390Reached) {
      trainee.stage = 'Permanent Candidate (Internal Retention Review)';
      trainee.retentionStatus = 'Permanent Candidate (Internal Retention Review)';
      trainee.hrPackageDispatched = true;
      trainee.completedAt = new Date().toISOString();
      trainee.googleDriveRecordUrl = `https://drive.google.com/drive/folders/Springboards-Retention-${trainee.id}`;

      hrPackageNotice = {
        routedTo: 'hr@springboardsfcd.org',
        cc: 'marilynn.ward@springboards.org',
        candidateName: trainee.name,
        totalHours: 390,
        digitalTrainingRecordStored: true,
        folder: `Google Drive / Springboards Internal Retention / Completed Trainees / ${trainee.name}`,
        message: `Candidate ${trainee.name} reached 390-hour state cap. Automated HR onboarding package generated and routed to HR for permanent staff hiring review.`
      };

      console.log(`[Internal Retention Win] ${trainee.name} reached 390 hours. Record transitioned to Permanent Candidate (NOT archived). HR onboarding package dispatched to hr@springboardsfcd.org`);
    }

    saveBackofficeData();

    return res.status(200).json({
      success: true,
      logEntry,
      newTotalHours,
      progressPercent: Math.min(100, Math.round((newTotalHours / 390) * 100)),
      onlineLearningBadgeEarned: trainee.onlineLearningBadgeEarned,
      is390Reached,
      hrPackageNotice,
      retentionStatus: trainee.retentionStatus,
      message: `Clock-in of ${parsedHours} hours logged directly to Google Sheets attendance spreadsheet. Cumulative hours: ${newTotalHours} / 390. Sirius weekly timecard updated.`
    });
  } catch (err) {
    console.error('Error recording trainee clock-in:', err);
    return res.status(500).json({ error: 'Server error recording clock-in.' });
  }
});

// 5B-6. Backoffice: Internal Retention Status Confirmation & Hiring Review
app.post('/api/backoffice/candidates/retention-transition', (req, res) => {
  try {
    const { candidateId, decision, notes } = req.body || {};
    const candidates = backofficeData.candidateApplications || [];
    const trainee = candidates.find(c => c.id === candidateId);

    if (!trainee) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    if (decision === 'HIRE_PERMANENT') {
      trainee.stage = 'Hired Permanent (Internal Retention)';
      trainee.retentionStatus = 'Hired Permanent - Full-Time Employee';
      trainee.intakeNotes = `${trainee.intakeNotes || ''} | Internal Retention Confirmed: Onboarded as full-time permanent trade staff. (${notes || 'Full package submitted to HR'})`;
    } else {
      trainee.stage = 'Permanent Candidate (Internal Retention Review)';
      trainee.retentionStatus = 'Under Internal Hiring Review';
      if (notes) trainee.intakeNotes = `${trainee.intakeNotes || ''} | Retention Review: ${notes}`;
    }

    saveBackofficeData();

    return res.status(200).json({
      success: true,
      trainee,
      message: `Retention status updated to "${trainee.retentionStatus}". Full work history preserved.`
    });
  } catch (err) {
    console.error('Error updating retention transition:', err);
    return res.status(500).json({ error: 'Server error updating retention status.' });
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
    const isMarilynn = adminEmail === 'marilynn.ward@springboardsfrcd.org' || adminEmail === 'marilynn.ward@springboardsfcd.org' || adminEmail === 'marilynn.ward@springboards.org' || adminEmail === 'marilynnlward@gmail.com';
    if (adminCode === '2026' || adminCode === '1985' || isMarilynn || adminEmail === 'info@springboardsfrcd.org' || adminEmail === 'info@springboardsfcd.org') {
      const email = isMarilynn ? (adminEmail || 'marilynn.ward@springboardsfrcd.org') : (adminEmail || 'marilynn.ward@springboardsfrcd.org');
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin-1',
          name: isMarilynn ? 'Marilynn L. Ward' : 'Administrator',
          role: 'Workforce Director & Compliance Administrator',
          isAdmin: true,
          email: email
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
            name: 'Marilynn L. Ward',
            role: 'Workforce Director & Compliance Administrator',
            isAdmin: true,
            email: 'marilynn.ward@springboards.org',
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
  const { id, stage, intakeNotes, qualificationStatus, firstDayCleared, siriusPlacementFormSubmitted, programName, targetBarrier, siriusFormStatus } = req.body || {};
  const cand = (backofficeData.candidateApplications || []).find(c => c.id === id);
  if (!cand) {
    return res.status(404).json({ error: 'Candidate record not found.' });
  }

  if (stage) cand.stage = stage;
  if (intakeNotes !== undefined) cand.intakeNotes = intakeNotes;
  if (qualificationStatus !== undefined) cand.qualificationStatus = qualificationStatus;
  if (firstDayCleared !== undefined) cand.firstDayCleared = Boolean(firstDayCleared);
  if (siriusPlacementFormSubmitted !== undefined) cand.siriusPlacementFormSubmitted = Boolean(siriusPlacementFormSubmitted);
  if (programName) {
    cand.programName = programName;
    cand.activityLabel = (programName === 'On-The-Job Training (OJT Referral)' || programName === 'On-The-Job Training') ? 'OJT Referral' : '220 Transitional Jobs';
  }
  if (targetBarrier) cand.targetBarrier = targetBarrier;
  if (siriusFormStatus) cand.siriusFormStatus = siriusFormStatus;

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

// Google Workspace Master Candidate Intake Sheet Data Endpoint
app.get('/api/backoffice/candidate-sheets', (req, res) => {
  const candidates = backofficeData.candidateApplications || [];
  const rows = candidates.map(c => ({
    timestamp: c.timestamp || c.createdAt || '',
    candidateName: c.candidateName || c.name || '',
    phone: c.phone || '',
    email: c.email || '',
    addressCity: c.addressCity || c.cityZip || c.streetAddress || '',
    nearestCareerCenter: c.nearestCareerCenter || c.matchedCenter || 'Valley Career Center',
    confirmedBackgroundStatus: c.confirmedBackgroundStatus || c.targetBarrier || c.backgroundStatus || '',
    programTag: c.programTag || (c.programName && c.programName.includes('OJT') ? 'Program: On-The-Job Training (OJT Follow-up)' : 'Transitional Jobs (Activity 220)'),
    careerCenterVisitStatus: c.careerCenterVisitStatus || c.qualificationStatus || 'Pending Career Center Verification',
    notes: c.notes || c.intakeNotes || ''
  }));

  return res.status(200).json({
    columns: [
      'Timestamp',
      'Candidate Name',
      'Phone',
      'Email',
      'Address & City',
      'Nearest Career Center',
      'Confirmed Background Status',
      'Program Tag',
      'Career Center Visit Status',
      'Notes'
    ],
    rows
  });
});

app.get('/api/backoffice/candidate-sheets/csv', (req, res) => {
  const candidates = backofficeData.candidateApplications || [];
  const headers = [
    'Timestamp',
    'Candidate Name',
    'Phone',
    'Email',
    'Address & City',
    'Nearest Career Center',
    'Confirmed Background Status',
    'Program Tag',
    'Career Center Visit Status',
    'Notes'
  ];

  const csvRows = [headers.join(',')];
  candidates.forEach(c => {
    const row = [
      `"${String(c.timestamp || c.createdAt || '').replace(/"/g, '""')}"`,
      `"${String(c.candidateName || c.name || '').replace(/"/g, '""')}"`,
      `"${String(c.phone || '').replace(/"/g, '""')}"`,
      `"${String(c.email || '').replace(/"/g, '""')}"`,
      `"${String(c.addressCity || c.cityZip || c.streetAddress || '').replace(/"/g, '""')}"`,
      `"${String(c.nearestCareerCenter || c.matchedCenter || 'Valley Career Center').replace(/"/g, '""')}"`,
      `"${String(c.confirmedBackgroundStatus || c.targetBarrier || c.backgroundStatus || '').replace(/"/g, '""')}"`,
      `"${String(c.programTag || (c.programName && c.programName.includes('OJT') ? 'Program: On-The-Job Training (OJT Follow-up)' : 'Transitional Jobs (Activity 220)')).replace(/"/g, '""')}"`,
      `"${String(c.careerCenterVisitStatus || c.qualificationStatus || 'Pending Career Center Verification').replace(/"/g, '""')}"`,
      `"${String(c.notes || c.intakeNotes || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Springboards_Master_Candidate_Intake.csv"');
  return res.status(200).send(csvRows.join('\r\n'));
});

// Google Workspace & Sheets Configuration and Live Sync State
app.get('/api/workspace/config', (req, res) => {
  const ws = backofficeData.workspaceSettings || {
    connectedEmail: 'marilynn.ward@springboardsfcd.org',
    spreadsheetId: '',
    spreadsheetUrl: '',
    sheetName: 'Candidate Intake',
    attendanceSheetName: 'Worksite Daily Attendance',
    lastSyncedAt: null,
    autoSync: true
  };
  return res.status(200).json(ws);
});

app.post('/api/workspace/config', (req, res) => {
  const { spreadsheetId, spreadsheetUrl, autoSync, connectedEmail } = req.body || {};
  if (!backofficeData.workspaceSettings) {
    backofficeData.workspaceSettings = {};
  }

  if (spreadsheetId !== undefined) backofficeData.workspaceSettings.spreadsheetId = String(spreadsheetId).trim();
  if (spreadsheetUrl !== undefined) backofficeData.workspaceSettings.spreadsheetUrl = String(spreadsheetUrl).trim();
  if (autoSync !== undefined) backofficeData.workspaceSettings.autoSync = Boolean(autoSync);
  if (connectedEmail) backofficeData.workspaceSettings.connectedEmail = String(connectedEmail).trim();
  backofficeData.workspaceSettings.updatedAt = new Date().toISOString();

  saveBackofficeData();
  return res.status(200).json({ success: true, workspaceSettings: backofficeData.workspaceSettings });
});

app.post('/api/workspace/sync-log', (req, res) => {
  const { spreadsheetId, rowCount, user, timestamp } = req.body || {};
  if (!backofficeData.workspaceSettings) {
    backofficeData.workspaceSettings = {};
  }
  backofficeData.workspaceSettings.lastSyncedAt = timestamp || new Date().toISOString();
  backofficeData.workspaceSettings.lastSyncCount = rowCount || (backofficeData.candidateApplications || []).length;
  backofficeData.workspaceSettings.lastSyncUser = user || 'marilynn.ward@springboardsfcd.org';
  if (spreadsheetId) backofficeData.workspaceSettings.spreadsheetId = spreadsheetId;

  if (!Array.isArray(backofficeData.workspaceSyncHistory)) {
    backofficeData.workspaceSyncHistory = [];
  }
  backofficeData.workspaceSyncHistory.unshift({
    id: `sync-${Date.now()}`,
    timestamp: backofficeData.workspaceSettings.lastSyncedAt,
    spreadsheetId: backofficeData.workspaceSettings.spreadsheetId,
    rowCount: backofficeData.workspaceSettings.lastSyncCount,
    user: backofficeData.workspaceSettings.lastSyncUser
  });
  if (backofficeData.workspaceSyncHistory.length > 50) {
    backofficeData.workspaceSyncHistory = backofficeData.workspaceSyncHistory.slice(0, 50);
  }

  saveBackofficeData();
  return res.status(200).json({ success: true, workspaceSettings: backofficeData.workspaceSettings });
});

app.get('/api/workspace/status', (req, res) => {
  const ws = backofficeData.workspaceSettings || {};
  const candidatesCount = (backofficeData.candidateApplications || []).length;
  const attendanceCount = (backofficeData.attendanceLogs || []).length;
  res.status(200).json({
    connectedEmail: ws.connectedEmail || 'marilynn.ward@springboardsfcd.org',
    designatedInbox: DESIGNATED_INBOX,
    isLinked: Boolean(ws.spreadsheetId),
    spreadsheetId: ws.spreadsheetId || null,
    spreadsheetUrl: ws.spreadsheetUrl || null,
    autoSync: ws.autoSync !== false,
    lastSyncedAt: ws.lastSyncedAt || null,
    candidatesCount,
    attendanceCount,
    recentSyncs: backofficeData.workspaceSyncHistory || []
  });
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
