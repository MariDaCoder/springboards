import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let appletConfig = {};
try {
  const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch {
  appletConfig = {};
}

export const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  appletConfig.projectId ||
  'springboards-community-dev';

export const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  appletConfig.firestoreDatabaseId ||
  'ai-studio-springboardsland-71046992-4c5a-4c20-bdcd-c5ee24b8cc0a';

export const adminApp =
  getApps().length === 0
    ? initializeApp({
        projectId: firebaseProjectId,
      })
    : getApps()[0];

export const adminAuth = getAuth(adminApp);

export function getAdminFirestore() {
  try {
    return firestoreDatabaseId
      ? getFirestore(adminApp, firestoreDatabaseId)
      : getFirestore(adminApp);
  } catch {
    return null;
  }
}

