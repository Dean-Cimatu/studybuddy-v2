import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connect } from './db/connection';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

connect()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
      const clientDist = path.join(__dirname, '../../client/dist');
      app.use(express.static(clientDist));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }

    app.listen(PORT, () => {
      console.log(`✅ StudyBuddy v2 server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
