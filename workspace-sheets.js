// Springboards for Community Development - Google Workspace & Google Sheets Integration
// Handles OAuth 2.0 with https://www.googleapis.com/auth/spreadsheets for marilynn.ward@springboardsfrcd.org
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0732157838",
  appId: "1:1098367256506:web:5357fb4dbb3cc67c1b3f83",
  apiKey: "AIzaSyD8tri4z5gS2-E252XdiI6KlhLj9GTX9tM",
  authDomain: "gen-lang-client-0732157838.firebaseapp.com",
  storageBucket: "gen-lang-client-0732157838.firebasestorage.app",
  messagingSenderId: "1098367256506"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Google Auth Provider with Google Sheets scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
// Hint prompt for the Springboards administrative account
provider.setCustomParameters({
  login_hint: 'marilynn.ward@springboardsfrcd.org',
  prompt: 'select_account'
});

// MANDATORY: In-memory token cache ONLY (Never store tokens in localStorage or sessionStorage)
let cachedAccessToken = null;
let currentUser = null;
let isSigningIn = false;

// Internal state listeners
const listeners = new Set();

export function subscribeWorkspaceAuth(listener) {
  listeners.add(listener);
  listener({ user: currentUser, token: cachedAccessToken });
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn({ user: currentUser, token: cachedAccessToken });
    } catch (e) {
      console.error('[Workspace] Listener callback error:', e);
    }
  });
}

// Track auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    if (!cachedAccessToken && !isSigningIn) {
      // Token will be populated upon interactive sign-in
    }
  } else {
    currentUser = null;
    cachedAccessToken = null;
  }
  notifyListeners();
});

// Interactive Google Sign-In
export async function signInWithGoogle() {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Google Sheets OAuth access token.');
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    notifyListeners();
    console.log('[Workspace] Successfully authenticated with Google for', currentUser.email);
    return { user: currentUser, accessToken: cachedAccessToken };
  } catch (err) {
    console.error('[Workspace] Google Sign-in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

// Sign out and clear in-memory token
export async function signOutFromGoogle() {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
  notifyListeners();
}

export function getCachedToken() {
  return cachedAccessToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function isConnected() {
  return Boolean(currentUser && cachedAccessToken);
}

// --- Google Sheets API Functions ---

// 1. Create Master Candidate Intake & Attendance Spreadsheet in Google Drive
export async function createMasterSpreadsheet(customTitle = 'Springboards Master Candidate Intake & Attendance Tracker') {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Please sign in with Google first to create your spreadsheet.');
  }

  const payload = {
    properties: {
      title: customTitle
    },
    sheets: [
      {
        properties: {
          title: 'Candidate Intake',
          gridProperties: {
            frozenRowCount: 1
          }
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Timestamp' } },
                  { userEnteredValue: { stringValue: 'Candidate Name' } },
                  { userEnteredValue: { stringValue: 'Phone' } },
                  { userEnteredValue: { stringValue: 'Email' } },
                  { userEnteredValue: { stringValue: 'Address & City' } },
                  { userEnteredValue: { stringValue: 'Nearest Career Center' } },
                  { userEnteredValue: { stringValue: 'Confirmed Background Status' } },
                  { userEnteredValue: { stringValue: 'Program Tag' } },
                  { userEnteredValue: { stringValue: 'Career Center Visit Status' } },
                  { userEnteredValue: { stringValue: 'Notes' } }
                ]
              }
            ]
          }
        ]
      },
      {
        properties: {
          title: 'Worksite Daily Attendance',
          gridProperties: {
            frozenRowCount: 1
          }
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Timestamp' } },
                  { userEnteredValue: { stringValue: 'Work Date' } },
                  { userEnteredValue: { stringValue: 'Candidate ID' } },
                  { userEnteredValue: { stringValue: 'Trainee Name' } },
                  { userEnteredValue: { stringValue: 'Trade Specialty & Role' } },
                  { userEnteredValue: { stringValue: 'Hours Worked Today' } },
                  { userEnteredValue: { stringValue: 'Weekly Hours Logged (Max 32)' } },
                  { userEnteredValue: { stringValue: 'Cumulative Total Hours (390 Cap)' } },
                  { userEnteredValue: { stringValue: '195h Online Learning' } },
                  { userEnteredValue: { stringValue: 'Retention Status' } },
                  { userEnteredValue: { stringValue: 'Training Bay Task' } },
                  { userEnteredValue: { stringValue: 'Supervisor Work Notes' } },
                  { userEnteredValue: { stringValue: 'Sirius Timecard Status' } }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to create spreadsheet (HTTP ${response.status})`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Persist the spreadsheet configuration to backoffice
  await saveSpreadsheetConfig({
    spreadsheetId,
    spreadsheetUrl,
    title: customTitle,
    createdBy: currentUser?.email || 'marilynn.ward@springboardsfcd.org'
  });

  return { spreadsheetId, spreadsheetUrl, title: customTitle };
}

// 2. Append a single candidate row to the live Google Sheet
export async function appendCandidateToSheet(spreadsheetId, candidate) {
  const token = getCachedToken();
  if (!token || !spreadsheetId) return null;

  const range = "'Candidate Intake'!A1";
  const row = [
    candidate.timestamp || new Date().toISOString(),
    candidate.candidateName || candidate.name || '',
    candidate.phone || '',
    candidate.email || '',
    candidate.addressCity || candidate.streetAddress || '',
    candidate.nearestCareerCenter || candidate.matchedCenter || 'Valley Career Center',
    candidate.confirmedBackgroundStatus || candidate.targetBarrier || '',
    candidate.programTag || (candidate.programName?.includes('OJT') ? 'Program: On-The-Job Training (OJT Follow-up)' : 'Transitional Jobs (Activity 220)'),
    candidate.careerCenterVisitStatus || candidate.qualificationStatus || 'Pending Career Center Verification',
    candidate.notes || candidate.intakeNotes || ''
  ];

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [row]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Workspace] Append candidate failed:', err);
      return { success: false, error: err.error?.message };
    }

    const data = await res.json();
    console.log('[Workspace] Candidate row appended to Google Sheets:', data);
    return { success: true, updatedRange: data.updates?.updatedRange };
  } catch (e) {
    console.error('[Workspace] Append candidate error:', e);
    return { success: false, error: e.message };
  }
}

// 3. Append Daily Attendance Clock-In Row to Worksite Daily Attendance Sheet
export async function appendAttendanceToSheet(spreadsheetId, logEntry) {
  const token = getCachedToken();
  if (!token || !spreadsheetId) return null;

  const range = "'Worksite Daily Attendance'!A1";
  const row = [
    logEntry.syncedAt || new Date().toISOString(),
    logEntry.date || new Date().toISOString().split('T')[0],
    logEntry.candidateId || '',
    logEntry.traineeName || 'Trainee',
    logEntry.trade || 'General Construction',
    logEntry.hoursWorked || 8,
    logEntry.weeklyHoursLogged || 32,
    logEntry.cumulativeHours || 8,
    logEntry.cumulativeHours >= 195 ? 'Completed (195h)' : 'In Progress',
    logEntry.cumulativeHours >= 390 ? 'Permanent Candidate (Internal Retention Review)' : 'Active Worksite Trainee',
    logEntry.taskArea || 'Wall Framing & Bay Assembly',
    logEntry.supervisorNotes || '',
    'Approved for Sirius Workforce LLC'
  ];

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [row]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Workspace] Append attendance failed:', err);
      return { success: false, error: err.error?.message };
    }

    const data = await res.json();
    return { success: true, updatedRange: data.updates?.updatedRange };
  } catch (e) {
    console.error('[Workspace] Append attendance error:', e);
    return { success: false, error: e.message };
  }
}

// 4. Batch Sync All Candidates to Google Sheet
export async function syncAllCandidatesToSheet(spreadsheetId, candidates) {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated with Google.');
  if (!spreadsheetId) throw new Error('No target Google Spreadsheet specified.');

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

  const rows = [headers];
  candidates.forEach(c => {
    rows.push([
      c.timestamp || c.createdAt || new Date().toISOString(),
      c.candidateName || c.name || '',
      c.phone || '',
      c.email || '',
      c.addressCity || c.streetAddress || c.cityZip || '',
      c.nearestCareerCenter || c.matchedCenter || 'Valley Career Center',
      c.confirmedBackgroundStatus || c.targetBarrier || c.backgroundStatus || '',
      c.programTag || (c.programName?.includes('OJT') ? 'Program: On-The-Job Training (OJT Follow-up)' : 'Transitional Jobs (Activity 220)'),
      c.careerCenterVisitStatus || c.qualificationStatus || 'Pending Career Center Verification',
      c.notes || c.intakeNotes || ''
    ]);
  });

  const range = "'Candidate Intake'!A1:J" + rows.length;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sync failed with HTTP ${res.status}`);
  }

  // Update backoffice sync timestamp
  await fetch('/api/workspace/sync-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spreadsheetId,
      rowCount: candidates.length,
      user: currentUser?.email || 'marilynn.ward@springboardsfcd.org',
      timestamp: new Date().toISOString()
    })
  }).catch(() => {});

  return await res.json();
}

// 5. Verify Spreadsheet Access
export async function testSpreadsheetAccess(spreadsheetId) {
  const token = getCachedToken();
  if (!token) return { accessible: false, error: 'Sign in to test spreadsheet connection.' };

  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { accessible: false, error: err.error?.message || 'Access denied or sheet not found.' };
    }

    const data = await res.json();
    return {
      accessible: true,
      title: data.properties?.title,
      sheets: data.sheets?.map(s => s.properties?.title) || []
    };
  } catch (e) {
    return { accessible: false, error: e.message };
  }
}

// Server Config Persistence
export async function getSpreadsheetConfig() {
  try {
    const res = await fetch('/api/workspace/config');
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[Workspace] Error loading config:', e);
  }
  return {
    connectedEmail: 'marilynn.ward@springboardsfcd.org',
    spreadsheetId: '',
    spreadsheetUrl: '',
    autoSync: true
  };
}

export async function saveSpreadsheetConfig(config) {
  try {
    const res = await fetch('/api/workspace/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await res.json();
  } catch (e) {
    console.error('[Workspace] Error saving config:', e);
  }
}

// Global window attachment for non-module scripts
window.SpringboardsWorkspace = {
  signInWithGoogle,
  signOutFromGoogle,
  getCachedToken,
  getCurrentUser,
  isConnected,
  subscribeWorkspaceAuth,
  createMasterSpreadsheet,
  appendCandidateToSheet,
  appendAttendanceToSheet,
  syncAllCandidatesToSheet,
  testSpreadsheetAccess,
  getSpreadsheetConfig,
  saveSpreadsheetConfig
};
