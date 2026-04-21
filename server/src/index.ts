import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connect } from './db/connection';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import aiRouter from './routes/ai';
import statsRouter from './routes/stats';
import modulesRouter from './routes/modules';
import calendarRouter from './routes/calendar';
import plannerRouter from './routes/planner';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/stats', statsRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/planner', plannerRouter);

connect()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    const isProd = process.env.NODE_ENV === 'production';

    // Serve the compiled React app — in Docker the dist always exists;
    // skip only in local dev where Vite's own server handles the client
    const clientDist = path.join(__dirname, '../../client/dist');
    if (isProd || fs.existsSync(clientDist)) {
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
