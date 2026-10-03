// Springboards for Community Development - Transitional Jobs Intake & Goal-Tracking Flow
// Integrates with Cloud Firestore (Transitional_Prospects collection) and Firebase Anonymous Authentication

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
  getDocFromServer,
  updateDoc
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

const FIRESTORE_DATABASE_ID = "ai-studio-springboardsland-71046992-4c5a-4c20-bdcd-c5ee24b8cc0a";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

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
let selectedTrade = "Carpentry & Construction Technology";

let prospectData = {
  uid: null,
  firstName: "",
  lastName: "",
  name: "",
  phone: "",
  email: "",
  trade: "Carpentry & Construction Technology",
  primaryGoal: "Transitional Jobs & Paid Vocational Training",
  status: "in_progress",
  currentStep: "1",
  createdAt: null,
  updatedAt: null
};

// Fallback session UID if Anonymous Auth has not yet been toggled on in Firebase Console
function getFallbackSessionUid() {
  try {
    let uid = sessionStorage.getItem('springboards_candidate_uid') || localStorage.getItem('springboards_candidate_uid');
    if (!uid || !/^[a-zA-Z0-9_\-]+$/.test(uid)) {
      uid = 'cand_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('springboards_candidate_uid', uid);
      localStorage.setItem('springboards_candidate_uid', uid);
    }
    return uid;
  } catch {
    return 'cand_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }
}

// Initialize Anonymous Firebase Auth session so guest visitors appear in Firebase Console Auth Users list
async function initAnonymousAuthSession() {
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid) {
      currentProspectUid = user.uid;
      prospectData.uid = user.uid;
    }
  });

  try {
    if (!auth.currentUser) {
      const cred = await signInAnonymously(auth);
      if (cred && cred.user) {
        currentProspectUid = cred.user.uid;
        prospectData.uid = cred.user.uid;
      }
    } else {
      currentProspectUid = auth.currentUser.uid;
      prospectData.uid = auth.currentUser.uid;
    }
  } catch (err) {
    if (err && err.code === 'auth/admin-restricted-operation') {
      console.info(
        "[Springboards Auth] Anonymous authentication needs to be enabled in Firebase Console (Authentication > Sign-in method > Anonymous). Using fallback session ID until enabled."
      );
    } else {
      console.warn("[Springboards Auth] Anonymous auth error:", err);
    }
    if (!currentProspectUid) {
      currentProspectUid = getFallbackSessionUid();
      prospectData.uid = currentProspectUid;
    }
  }
}

// Ensure UID
function getOrGenerateUid() {
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  if (!currentProspectUid) {
    currentProspectUid = getFallbackSessionUid();
  }
  return currentProspectUid;
}

// Save / sync helper
async function persistProspect(candidateDoc, opType = OperationType.WRITE) {
  const docPath = `Transitional_Prospects/${candidateDoc.uid}`;
  let firestoreSuccess = false;

  // 1. Direct Cloud Firestore write
  try {
    const docRef = doc(db, 'Transitional_Prospects', candidateDoc.uid);
    await setDoc(docRef, candidateDoc, { merge: true });
    firestoreSuccess = true;
  } catch (fsErr) {
    console.warn("[Springboards Intake] Firestore write error, syncing via server fallback:", fsErr.message);
  }

  // 2. Dual persistence via server API
  try {
    await fetch('/api/transitional-prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateDoc)
    });
  } catch (apiErr) {
    console.warn("[Springboards Intake] Server sync error:", apiErr);
  }

  return firestoreSuccess;
}

// DOM Setup
document.addEventListener("DOMContentLoaded", () => {
  initAnonymousAuthSession();

  // Elements
  const modal = document.getElementById("candidateModal");
  const closeBtns = document.querySelectorAll("[data-candidate-close]");
  const finishBtn = document.getElementById("intakeFinishBtn");

  const progressHeader = document.getElementById("intakeProgressHeader");
  const progressFill = document.getElementById("intakeProgressFill");
  const stepIndicator = document.getElementById("intakeStepIndicator");

  // Screen 1 Elements
  const screen1 = document.getElementById("intakeScreen1");
  const screen1Form = document.getElementById("intakeScreen1Form");
  const firstNameInput = document.getElementById("intakeFirstNameInput");
  const lastNameInput = document.getElementById("intakeLastNameInput");
  const step1NextBtn = document.getElementById("intakeStep1Next");
  const nameError = document.getElementById("intakeNameError");

  // Screen 2 Elements
  const screen2 = document.getElementById("intakeScreen2");
  const phoneInput = document.getElementById("intakePhoneInput");
  const emailInput = document.getElementById("intakeEmailInput");
  const contactError = document.getElementById("intakeContactError");
  const step2BackBtn = document.getElementById("intakeStep2Back");
  const step2NextBtn = document.getElementById("intakeStep2Next");

  // Screen 3 Elements
  const screen3 = document.getElementById("intakeScreen3");
  const tradeCardsContainer = document.getElementById("intakeTradeCards");
  const step3BackBtn = document.getElementById("intakeStep3Back");
  const step3NextBtn = document.getElementById("intakeStep3Next");

  // Screen 4 Elements
  const screen4 = document.getElementById("intakeScreen4");
  const summaryName = document.getElementById("summaryProspectName");
  const summaryContact = document.getElementById("summaryContactInfo");
  const summaryTrade = document.getElementById("summarySelectedTrade");

  // Helper: Open Modal
  function openIntakeModal(defaultTrade) {
    if (defaultTrade) {
      selectedTrade = defaultTrade;
    }
    if (modal) {
      modal.hidden = false;
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      goToStep(1);
      setTimeout(() => {
        if (firstNameInput) firstNameInput.focus();
      }, 150);
    }
  }

  // Helper: Close Modal
  function closeIntakeModal() {
    if (modal) {
      modal.hidden = true;
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  }

  const openBtns = document.querySelectorAll("#trainStartJourneyBtn, .btn-start-journey, .btn-candidate-trigger");
  openBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const defaultTrade = btn.dataset.tradeDefault || "Carpentry & Construction Technology";
      openIntakeModal(defaultTrade);
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener("click", closeIntakeModal);
  });

  if (finishBtn) {
    finishBtn.addEventListener("click", closeIntakeModal);
  }

  // Step Navigator
  function goToStep(step) {
    currentStepNumber = step;
    const screens = [screen1, screen2, screen3, screen4];
    screens.forEach((s, idx) => {
      if (s) {
        if (idx + 1 === step) {
          s.classList.add("active");
          s.style.display = "block";
        } else {
          s.classList.remove("active");
          s.style.display = "none";
        }
      }
    });

    if (progressFill) {
      const pct = Math.round((step / 4) * 100);
      progressFill.style.width = `${pct}%`;
      const track = progressFill.closest(".intake-progress-bar-track");
      if (track) track.setAttribute("aria-valuenow", String(pct));
    }

    if (stepIndicator) {
      stepIndicator.innerHTML = `Step <strong>${step}</strong> of 4`;
    }

    // Step-specific focus
    if (step === 1 && firstNameInput) {
      firstNameInput.focus();
    } else if (step === 2 && phoneInput) {
      phoneInput.focus();
    } else if (step === 4) {
      if (summaryName) summaryName.textContent = prospectData.name || "Candidate";
      if (summaryContact) {
        const parts = [prospectData.phone, prospectData.email].filter(Boolean);
        summaryContact.textContent = parts.length > 0 ? parts.join(" • ") : "To be confirmed";
      }
      if (summaryTrade) summaryTrade.textContent = prospectData.trade || selectedTrade;
    }
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: Introduction & User Profile Creation
  // Line 1: Centered question prompt: "What is your name?"
  // Line 2: Column 1 (Side-by-side First/Last Name) | Column 2 (Key-cap Continue button)
  // Submitting Screen 1 initializes and saves the candidate document in Firebase
  // --------------------------------------------------------------------------

  function triggerKeycapPressEffect() {
    if (step1NextBtn) {
      step1NextBtn.classList.add("is-pressed");
      setTimeout(() => {
        step1NextBtn.classList.remove("is-pressed");
      }, 180);
    }
  }

  async function handleScreen1Submit() {
    triggerKeycapPressEffect();

    const firstName = firstNameInput ? firstNameInput.value.trim() : "";
    const lastName = lastNameInput ? lastNameInput.value.trim() : "";

    if (!firstName || !lastName) {
      if (nameError) {
        nameError.textContent = "Please enter both your First Name and Last Name.";
        nameError.style.color = "#dc2626";
      }
      if (!firstName && firstNameInput) firstNameInput.focus();
      else if (!lastName && lastNameInput) lastNameInput.focus();
      return;
    }

    if (nameError) {
      nameError.textContent = "";
    }

    // Disable button during initialization
    if (step1NextBtn) step1NextBtn.disabled = true;

    try {
      const candidateUid = getOrGenerateUid();
      const nowIso = new Date().toISOString();
      const fullName = `${firstName} ${lastName}`;

      prospectData.uid = candidateUid;
      prospectData.firstName = firstName;
      prospectData.lastName = lastName;
      prospectData.name = fullName;
      prospectData.status = "in_progress";
      prospectData.currentStep = "1";
      prospectData.createdAt = prospectData.createdAt || nowIso;
      prospectData.updatedAt = nowIso;

      // INITIALIZE & SAVE in Firebase Transitional_Prospects collection
      await persistProspect({
        uid: candidateUid,
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        status: "in_progress",
        currentStep: "1",
        trade: prospectData.trade || selectedTrade,
        primaryGoal: prospectData.primaryGoal,
        createdAt: prospectData.createdAt,
        updatedAt: prospectData.updatedAt
      }, OperationType.CREATE);

      // Advance to Screen 2
      goToStep(2);
    } catch (err) {
      console.error("[Springboards Intake] Error initializing prospect profile:", err);
      goToStep(2);
    } finally {
      if (step1NextBtn) step1NextBtn.disabled = false;
    }
  }

  if (screen1Form) {
    screen1Form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleScreen1Submit();
    });
  }

  if (step1NextBtn) {
    step1NextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleScreen1Submit();
    });
  }

  // Keyboard shortcut: Pressing Enter in inputs triggers submission with key-cap feedback
  [firstNameInput, lastNameInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleScreen1Submit();
        }
      });
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN 2: Contact Details (Phone OR Email)
  // --------------------------------------------------------------------------
  if (step2BackBtn) {
    step2BackBtn.addEventListener("click", () => goToStep(1));
  }

  async function handleScreen2Submit() {
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";

    if (!phone && !email) {
      if (contactError) {
        contactError.textContent = "Please provide at least a phone number or email address.";
        contactError.style.color = "#dc2626";
      }
      return;
    }

    if (contactError) contactError.textContent = "";

    prospectData.phone = phone;
    prospectData.email = email;
    prospectData.currentStep = "2";
    prospectData.updatedAt = new Date().toISOString();

    if (step2NextBtn) step2NextBtn.disabled = true;

    try {
      await persistProspect({
        uid: prospectData.uid,
        firstName: prospectData.firstName,
        lastName: prospectData.lastName,
        name: prospectData.name,
        phone: prospectData.phone,
        email: prospectData.email,
        trade: prospectData.trade,
        status: "in_progress",
        currentStep: "2",
        createdAt: prospectData.createdAt,
        updatedAt: prospectData.updatedAt
      }, OperationType.UPDATE);

      goToStep(3);
    } catch (err) {
      console.warn("Screen 2 error:", err);
      goToStep(3);
    } finally {
      if (step2NextBtn) step2NextBtn.disabled = false;
    }
  }

  if (step2NextBtn) {
    step2NextBtn.addEventListener("click", handleScreen2Submit);
  }

  [phoneInput, emailInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleScreen2Submit();
        }
      });
    }
  });

  // --------------------------------------------------------------------------
  // SCREEN 3: Trade Pathway Selection
  // --------------------------------------------------------------------------
  if (step3BackBtn) {
    step3BackBtn.addEventListener("click", () => goToStep(2));
  }

  if (tradeCardsContainer) {
    tradeCardsContainer.querySelectorAll(".intake-choice-card").forEach(card => {
      card.addEventListener("click", () => {
        tradeCardsContainer.querySelectorAll(".intake-choice-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedTrade = card.dataset.value;
        prospectData.trade = selectedTrade;
      });
    });
  }

  async function handleScreen3Submit() {
    prospectData.trade = selectedTrade;
    prospectData.status = "completed";
    prospectData.currentStep = "3";
    prospectData.updatedAt = new Date().toISOString();

    if (step3NextBtn) step3NextBtn.disabled = true;

    try {
      await persistProspect({
        uid: prospectData.uid,
        firstName: prospectData.firstName,
        lastName: prospectData.lastName,
        name: prospectData.name,
        phone: prospectData.phone,
        email: prospectData.email,
        trade: prospectData.trade,
        status: "completed",
        currentStep: "4",
        createdAt: prospectData.createdAt,
        updatedAt: prospectData.updatedAt
      }, OperationType.UPDATE);

      goToStep(4);
    } catch (err) {
      console.warn("Screen 3 error:", err);
      goToStep(4);
    } finally {
      if (step3NextBtn) step3NextBtn.disabled = false;
    }
  }

  if (step3NextBtn) {
    step3NextBtn.addEventListener("click", handleScreen3Submit);
  }
});
