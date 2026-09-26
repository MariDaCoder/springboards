import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import Firebase Admin services
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 2. Initialize the Admin SDK (No-cost, automatic credentials on App Hosting!)
initializeApp();
const db = getFirestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Allows your routes to parse incoming JSON payloads
app.use(express.static(__dirname));

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
