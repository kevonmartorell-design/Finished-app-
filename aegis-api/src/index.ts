import env from './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { generalLimiter } from './middleware/rateLimit';
import { AppError } from './utils/errors';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { startInactivityJob } from './jobs/inactivityJob';

const app = express();

// ─── Security Headers ────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Trust Proxy (required for rate limiting behind load balancer) ─
app.set('trust proxy', 1);

// ─── Global Rate Limiter ─────────────────────────────────────────
app.use(generalLimiter);

// ─── Health Check ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'aegis-auth', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.`, code: 'NOT_FOUND', statusCode: 404 });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code, statusCode: err.status });
  }
  logger.error('Unhandled error in request', { error: err.message });
  res.status(500).json({ error: 'An unexpected error occurred.', code: 'INTERNAL_ERROR', statusCode: 500 });
});

// ─── Start Server ────────────────────────────────────────────────
if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info(`AEGIS Auth Service running on port ${env.PORT}`, { env: env.NODE_ENV });
    startInactivityJob();
  });
}

export default app;
