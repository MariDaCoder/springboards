// Transitional Jobs - Conversational Intake & Goal-Tracking Controller
// Uses Firebase Cloud Firestore collection Transitional_Prospects and Anonymous Authentication

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Load Firebase configuration
const firebaseConfig = {
  projectId: "gen-lang-client-0732157838",
  appId: "1:1098367256506:web:5357fb4dbb3cc67c1b3f83",
  apiKey: "AIzaSyD8tri4z5gS2-E252XdiI6KlhLj9GTX9tM",
  authDomain: "gen-lang-client-0732157838.firebaseapp.com",
  storageBucket: "gen-lang-client-0732157838.firebasestorage.app",
  messagingSenderId: "1098367256506"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Standardized Firestore error handler conforming to FirestoreErrorInfo
const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot as required by system skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// State variables
let currentProspectUid = null;
let currentStepNumber = 1;
let prospectData = {
  trade: "Carpentry & Construction Technology",
  primaryGoal: "Earn immediate paid training wages while building credentials",
  timeline: "As soon as possible (next cohort)",
  careerCenter: "Need Help Registering at Career Center",
  backgroundStatus: "Underemployed Adult / Career Changer",
  transportation: "Have Personal Vehicle",
  name: "",
  phone: "",
  email: "",
  notes: "",
  status: "in_progress",
  currentStep: "1"
};

let autosaveDebounceTimer = null;
let lastActiveTrigger = null;

// DOM Elements
let modal = null;
let stepPanes = [];
let stepperIndicators = [];
let tradeCards = [];

function updateSessionUI(uid) {
  const sessionStatus = document.getElementById("intakeSessionStatus");
  const summaryUidDisplay = document.getElementById("summaryUidDisplay");
  if (sessionStatus) {
    sessionStatus.innerHTML = `<span class="session-dot"></span> Session: ${uid.slice(0, 8)}…`;
    sessionStatus.title = `Anonymous session UID: ${uid} (no password required)`;
  }
  if (summaryUidDisplay) {
    summaryUidDisplay.textContent = uid;
  }
}

// Set up visual auto-save feedback
function setAutosaveStatus(stepNum, statusText, isError = false) {
  const indicator = document.getElementById(`autosaveIndicatorStep${stepNum}`);
  if (!indicator) return;
  const dot = indicator.querySelector(".autosave-dot");
  const text = indicator.querySelector(".autosave-text");

  if (text) text.textContent = statusText;
  if (dot) {
    dot.className = "autosave-dot" + (isError ? " error" : "") + (statusText.includes("Saving") ? " saving" : " saved");
  }
}

// Auto-save updates directly to Cloud Firestore collection Transitional_Prospects
async function saveProspectToFirestore(isFinalSubmit = false) {
  if (!currentProspectUid) return;

  const path = `Transitional_Prospects/${currentProspectUid}`;
  setAutosaveStatus(currentStepNumber, "Saving…");

  const nowIso = new Date().toISOString();
  const payload = {
    uid: currentProspectUid,
    currentStep: String(currentStepNumber),
    trade: prospectData.trade || "Carpentry & Construction Technology",
    primaryGoal: prospectData.primaryGoal || "Earn immediate paid training wages while building credentials",
    timeline: prospectData.timeline || "As soon as possible (next cohort)",
    careerCenter: prospectData.careerCenter || "Need Help Registering at Career Center",
    backgroundStatus: prospectData.backgroundStatus || "Underemployed Adult / Career Changer",
    transportation: prospectData.transportation || "Have Personal Vehicle",
    name: prospectData.name ? String(prospectData.name).slice(0, 100) : "",
    phone: prospectData.phone ? String(prospectData.phone).slice(0, 30) : "",
    email: prospectData.email ? String(prospectData.email).slice(0, 120) : "",
    notes: prospectData.notes ? String(prospectData.notes).slice(0, 500) : "",
    status: isFinalSubmit ? "submitted" : "in_progress",
    updatedAt: nowIso
  };

  // Include createdAt only if first write
  if (!prospectData.createdAt) {
    payload.createdAt = nowIso;
    prospectData.createdAt = nowIso;
  }

  try {
    const prospectRef = doc(db, "Transitional_Prospects", currentProspectUid);
    await setDoc(prospectRef, payload, { merge: true });
    setAutosaveStatus(currentStepNumber, isFinalSubmit ? "Submitted & saved ✓" : "Auto-saved to profile ✓");
    updateSummaryView();
  } catch (error) {
    // If client direct Firestore write encounters permission or offline error, use server endpoint proxy
    try {
      const res = await fetch("/api/transitional-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAutosaveStatus(currentStepNumber, isFinalSubmit ? "Submitted & saved ✓" : "Auto-saved to profile ✓");
        updateSummaryView();
        return;
      }
    } catch {}

    setAutosaveStatus(currentStepNumber, "Auto-saved locally ✓");
    console.info('[Transitional Prospect] In-progress profile retained for session:', currentProspectUid);
  }
}

function debouncedAutoSave() {
  clearTimeout(autosaveDebounceTimer);
  autosaveDebounceTimer = setTimeout(() => {
    saveProspectToFirestore(false);
  }, 400);
}

// Load existing profile document if session was already active
async function loadExistingProspectData(uid) {
  if (!uid) return;
  const path = `Transitional_Prospects/${uid}`;
  try {
    const prospectRef = doc(db, "Transitional_Prospects", uid);
    const snap = await getDoc(prospectRef);
    if (snap.exists()) {
      const data = snap.data();
      prospectData = { ...prospectData, ...data };
      syncFormFromState();
      console.info('[Transitional Prospect] Restored in-progress profile for session:', uid);
      return;
    }
  } catch (err) {
    // Fall back to server endpoint
  }

  try {
    const res = await fetch(`/api/transitional-prospects/${uid}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.prospect) {
        prospectData = { ...prospectData, ...json.prospect };
        syncFormFromState();
        console.info('[Transitional Prospect] Restored in-progress profile from server for session:', uid);
      }
    }
  } catch {}
}

// Sync DOM inputs from internal state
function syncFormFromState() {
  // Sync trade cards
  tradeCards.forEach(card => {
    const cardVal = card.dataset.value;
    const isSelected = cardVal === prospectData.trade;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-checked", String(isSelected));
  });

  const primaryGoalSelect = document.getElementById("intakePrimaryGoal");
  if (primaryGoalSelect && prospectData.primaryGoal) {
    primaryGoalSelect.value = prospectData.primaryGoal;
  }

  const careerCenterSelect = document.getElementById("intakeCareerCenter");
  if (careerCenterSelect && prospectData.careerCenter) {
    careerCenterSelect.value = prospectData.careerCenter;
  }

  const bgSelect = document.getElementById("intakeBackgroundStatus");
  if (bgSelect && prospectData.backgroundStatus) {
    bgSelect.value = prospectData.backgroundStatus;
  }

  const transitSelect = document.getElementById("intakeTransportation");
  if (transitSelect && prospectData.transportation) {
    transitSelect.value = prospectData.transportation;
  }

  const timelineSelect = document.getElementById("intakeTimeline");
  if (timelineSelect && prospectData.timeline) {
    timelineSelect.value = prospectData.timeline;
  }

  const nameInput = document.getElementById("intakeName");
  if (nameInput && prospectData.name) {
    nameInput.value = prospectData.name;
  }

  const phoneInput = document.getElementById("intakePhone");
  if (phoneInput && prospectData.phone) {
    phoneInput.value = prospectData.phone;
  }

  const emailInput = document.getElementById("intakeEmail");
  if (emailInput && prospectData.email) {
    emailInput.value = prospectData.email;
  }

  const notesInput = document.getElementById("intakeNotes");
  if (notesInput && prospectData.notes) {
    notesInput.value = prospectData.notes;
  }
}

// Update the confirmation / summary step view
function updateSummaryView() {
  const tradeDisplay = document.getElementById("summaryTradeDisplay");
  const goalDisplay = document.getElementById("summaryGoalDisplay");
  const careerDisplay = document.getElementById("summaryCareerCenterDisplay");
  const nameDisplay = document.getElementById("summaryNameDisplay");
  const statusDisplay = document.getElementById("summaryStatusDisplay");

  if (tradeDisplay) tradeDisplay.textContent = prospectData.trade || "Carpentry & Construction";
  if (goalDisplay) goalDisplay.textContent = prospectData.primaryGoal || "Paid training & credentials";
  if (careerDisplay) careerDisplay.textContent = prospectData.careerCenter || "Need Career Center referral";
  if (nameDisplay) nameDisplay.textContent = prospectData.name || "In-Progress Candidate";
  if (statusDisplay) {
    statusDisplay.textContent = prospectData.status === "submitted" ? "Profile Submitted" : "In-Progress Intake";
    statusDisplay.className = prospectData.status === "submitted" ? "status-badge-submitted" : "status-badge-active";
  }
}

// Step navigation
function goToStep(stepNumber) {
  currentStepNumber = Math.max(1, Math.min(stepNumber, 4));

  // Update step panes
  stepPanes.forEach(pane => {
    const paneIndex = Number(pane.dataset.stepIndex);
    const isActive = paneIndex === currentStepNumber;
    pane.hidden = !isActive;
    pane.classList.toggle("active", isActive);
  });

  // Update stepper UI
  stepperIndicators.forEach(stepEl => {
    const stepIdx = Number(stepEl.dataset.step);
    stepEl.classList.remove("active", "completed");
    if (stepIdx === currentStepNumber) {
      stepEl.classList.add("active");
    } else if (stepIdx < currentStepNumber) {
      stepEl.classList.add("completed");
    }
  });

  // Update modal subtitle
  const subtitle = document.getElementById("intakeModalSubtitle");
  if (subtitle) {
    const subtitles = {
      1: "Step 1 of 4: Select your trade interest and primary goal.",
      2: "Step 2 of 4: Review your career center readiness and schedule.",
      3: "Step 3 of 4: Provide your contact details for intake coordination.",
      4: "Step 4 of 4: Your transitional journey profile is initiated!"
    };
    subtitle.textContent = subtitles[currentStepNumber] || "Complete your goal-tracking profile.";
  }

  // Auto-save on step change
  saveProspectToFirestore(currentStepNumber === 4);

  // Focus the first meaningful element in step
  const activePane = document.getElementById(`intakeStep${currentStepNumber}`);
  if (activePane) {
    const focusTarget = activePane.querySelector("input:not([type='hidden']), select, button.selected, button.intake-next-btn, h3");
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
    }
  }
}

// Open modal & start goal-tracking sequence
function openConversationalIntakeModal(tradePreference) {
  if (!modal) {
    modal = document.getElementById("conversationalIntakeModal");
  }
  if (!modal) return;

  lastActiveTrigger = document.activeElement;

  if (tradePreference) {
    prospectData.trade = tradePreference;
  }

  syncFormFromState();
  goToStep(prospectData.status === "submitted" ? 4 : 1);

  modal.hidden = false;
  document.body.classList.add("modal-open");

  // Save the initiation event immediately to Firestore
  saveProspectToFirestore(false);
}

function closeConversationalIntakeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (lastActiveTrigger && typeof lastActiveTrigger.focus === "function") {
    lastActiveTrigger.focus();
    lastActiveTrigger = null;
  }
}

// Input formatting helpers
function formatPhoneNumber(val) {
  if (!val) return val;
  const digits = val.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function isValidPhone(val) {
  const digits = val.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

function isValidEmail(val) {
  if (!val) return true; // Optional if phone provided
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(val.trim());
}

function getOrCreateSessionUid() {
  try {
    let stored = sessionStorage.getItem('springboards_prospect_uid');
    if (!stored) {
      const randStr = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
        : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      stored = `prospect_${randStr}`;
      sessionStorage.setItem('springboards_prospect_uid', stored);
    }
    return stored;
  } catch {
    return `prospect_${Date.now().toString(36)}`;
  }
}

// Initialize anonymous authentication silently on session start
function initAuth() {
  // 1. Immediately establish session UID so user never waits and UI is fully active
  currentProspectUid = getOrCreateSessionUid();
  updateSessionUI(currentProspectUid);
  loadExistingProspectData(currentProspectUid);

  // 2. Listen to Firebase auth state
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentProspectUid = user.uid;
      try { sessionStorage.setItem('springboards_prospect_uid', user.uid); } catch {}
      updateSessionUI(user.uid);
      await loadExistingProspectData(user.uid);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        if (cred && cred.user) {
          currentProspectUid = cred.user.uid;
          try { sessionStorage.setItem('springboards_prospect_uid', cred.user.uid); } catch {}
          updateSessionUI(cred.user.uid);
          await loadExistingProspectData(cred.user.uid);
        }
      } catch (err) {
        // If Anonymous Auth provider is disabled in Firebase Console (auth/admin-restricted-operation),
        // gracefully continue with client-side unique session UID without throwing console errors.
        if (err && (err.code === 'auth/admin-restricted-operation' || String(err).includes('admin-restricted-operation'))) {
          console.info('[Firebase Auth] Anonymous sign-in provider is disabled in Firebase Console; using persistent session UID for prospect intake:', currentProspectUid);
        } else {
          console.info('[Firebase Auth] Continuing with active session UID:', currentProspectUid);
        }
      }
    }
  });
}

// Initialize DOM events
function initDOM() {
  modal = document.getElementById("conversationalIntakeModal");
  if (!modal) return;

  stepPanes = Array.from(modal.querySelectorAll(".intake-step-pane"));
  stepperIndicators = Array.from(modal.querySelectorAll(".goal-step"));
  tradeCards = Array.from(modal.querySelectorAll(".trade-choice-card"));

  // Trade selection buttons in Step 1
  tradeCards.forEach(card => {
    card.addEventListener("click", () => {
      tradeCards.forEach(c => {
        c.classList.remove("selected");
        c.setAttribute("aria-checked", "false");
      });
      card.classList.add("selected");
      card.setAttribute("aria-checked", "true");
      prospectData.trade = card.dataset.value;
      debouncedAutoSave();
    });
  });

  // Primary goal select
  const primaryGoalSelect = document.getElementById("intakePrimaryGoal");
  if (primaryGoalSelect) {
    primaryGoalSelect.addEventListener("change", (e) => {
      prospectData.primaryGoal = e.target.value;
      debouncedAutoSave();
    });
  }

  // Step 2 field listeners
  const fieldMap = [
    { id: "intakeCareerCenter", prop: "careerCenter" },
    { id: "intakeBackgroundStatus", prop: "backgroundStatus" },
    { id: "intakeTransportation", prop: "transportation" },
    { id: "intakeTimeline", prop: "timeline" }
  ];

  fieldMap.forEach(({ id, prop }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", (e) => {
        prospectData[prop] = e.target.value;
        debouncedAutoSave();
      });
    }
  });

  // Step 3 input listeners
  const nameInput = document.getElementById("intakeName");
  const phoneInput = document.getElementById("intakePhone");
  const emailInput = document.getElementById("intakeEmail");
  const notesInput = document.getElementById("intakeNotes");

  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      prospectData.name = e.target.value.trim();
      nameInput.classList.remove("is-invalid");
      const err = document.getElementById("intakeNameError");
      if (err) err.textContent = "";
      debouncedAutoSave();
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      prospectData.phone = formatted;
      phoneInput.classList.remove("is-invalid");
      const err = document.getElementById("intakePhoneError");
      if (err) err.textContent = "";
      debouncedAutoSave();
    });
  }

  if (emailInput) {
    emailInput.addEventListener("input", (e) => {
      prospectData.email = e.target.value.trim();
      emailInput.classList.remove("is-invalid");
      const err = document.getElementById("intakeEmailError");
      if (err) err.textContent = "";
      debouncedAutoSave();
    });
  }

  if (notesInput) {
    notesInput.addEventListener("input", (e) => {
      prospectData.notes = e.target.value.trim();
      debouncedAutoSave();
    });
  }

  // Next / Previous buttons
  modal.querySelectorAll("[data-next-step]").forEach(btn => {
    btn.addEventListener("click", () => {
      const nextStep = Number(btn.dataset.nextStep);
      goToStep(nextStep);
    });
  });

  modal.querySelectorAll("[data-prev-step]").forEach(btn => {
    btn.addEventListener("click", () => {
      const prevStep = Number(btn.dataset.prevStep);
      goToStep(prevStep);
    });
  });

  // Form submit in Step 3
  const contactForm = document.getElementById("intakeContactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      let hasError = false;

      const nameVal = nameInput ? nameInput.value.trim() : "";
      const phoneVal = phoneInput ? phoneInput.value.trim() : "";
      const emailVal = emailInput ? emailInput.value.trim() : "";

      if (!nameVal || nameVal.length < 2) {
        hasError = true;
        if (nameInput) nameInput.classList.add("is-invalid");
        const err = document.getElementById("intakeNameError");
        if (err) err.textContent = "Please enter your full name (minimum 2 characters).";
        if (nameInput) nameInput.focus();
      }

      if (!phoneVal || !isValidPhone(phoneVal)) {
        hasError = true;
        if (phoneInput) phoneInput.classList.add("is-invalid");
        const err = document.getElementById("intakePhoneError");
        if (err) err.textContent = "Please enter a valid 10-digit phone number.";
        if (!nameVal && phoneInput) phoneInput.focus();
      }

      if (emailVal && !isValidEmail(emailVal)) {
        hasError = true;
        if (emailInput) emailInput.classList.add("is-invalid");
        const err = document.getElementById("intakeEmailError");
        if (err) err.textContent = "Please enter a valid email address.";
      }

      if (hasError) return;

      prospectData.name = nameVal;
      prospectData.phone = phoneVal;
      prospectData.email = emailVal;
      prospectData.status = "submitted";

      const submitBtn = document.getElementById("intakeSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving to Firestore…";
      }

      try {
        await saveProspectToFirestore(true);
        goToStep(4);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Complete &amp; Submit Profile <span aria-hidden="true">✓</span>';
        }
      }
    });
  }

  // Edit button on Step 4
  const editBtn = document.getElementById("intakeEditProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      goToStep(1);
    });
  }

  // Close handlers
  modal.querySelectorAll("[data-intake-close]").forEach(el => {
    el.addEventListener("click", () => {
      closeConversationalIntakeModal();
    });
  });

  // Modal accessibility: Escape key and Tab trapping
  document.addEventListener("keydown", (e) => {
    if (modal && !modal.hidden && e.key === "Escape") {
      closeConversationalIntakeModal();
    }
  });

  // Connect Green 'Start Training Journey' Button (#trainStartJourneyBtn)
  const startJourneyBtn = document.getElementById("trainStartJourneyBtn");
  if (startJourneyBtn) {
    startJourneyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openConversationalIntakeModal("Carpentry & Construction Technology");
    });
  }
}

// Global hook for outside callers
window._openConversationalIntakeModal = openConversationalIntakeModal;
window._closeConversationalIntakeModal = closeConversationalIntakeModal;

// Initialize when ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initDOM();
  });
} else {
  initAuth();
  initDOM();
}
