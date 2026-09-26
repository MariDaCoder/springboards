import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Allows your routes to parse incoming JSON payloads
app.use(express.static(__dirname));

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
  const inMemoryInquiries = [];
  db = {
    collection: () => ({
      get: async () => ({
        docs: inMemoryInquiries.map((item, idx) => ({
          id: `inquiry-${idx}`,
          data: () => item
        }))
      }),
      add: async (data) => {
        inMemoryInquiries.push(data);
        return { id: `inquiry-${Date.now()}` };
      }
    })
  };
}

// 3. Example API Route using Firebase Admin
app.get('/api/inquiries', async (req, res) => {
  try {
    const snapshot = await db.collection('programInquiries').get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
