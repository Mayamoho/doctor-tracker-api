import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import routes from './routes';

export const app = express();

// Render and the Vercel rewrite both terminate TLS upstream, so `req.ip` is only
// the real client when exactly one proxy hop is trusted. A permissive `true`
// would let any caller spoof it past the rate limiter.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

// Only relevant for direct cross-origin calls (local dev without the rewrite
// proxy). Production traffic arrives same-origin through Vercel.
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

/**
 * Touched by the keep-warm pinger, so it must stay cheap: no database call, no
 * auth. A cold instance answers this first and everything else after.
 */
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Doctor Tracker API',
      version: '1.0.0',
      authentication: 'httpOnly access + refresh cookies; see POST /api/v1/auth/login',
      endpoints: {
        auth: ['POST /api/v1/auth/login', 'POST /api/v1/auth/refresh', 'POST /api/v1/auth/logout', 'GET /api/v1/auth/me'],
        doctors: ['GET /api/v1/doctors', 'POST /api/v1/doctors', 'GET /api/v1/doctors/:id', 'PATCH /api/v1/doctors/:id', 'DELETE /api/v1/doctors/:id'],
        doctorPatients: ['GET /api/v1/doctors/:id/patients', 'POST /api/v1/doctors/:id/patients', 'DELETE /api/v1/doctors/:id/patients/:patientId'],
        patients: ['GET /api/v1/patients', 'POST /api/v1/patients', 'GET /api/v1/patients/:id', 'PATCH /api/v1/patients/:id', 'DELETE /api/v1/patients/:id'],
        dashboard: ['GET /api/v1/dashboard/stats', 'GET /api/v1/dashboard/filter-options'],
      },
      listParams: 'page, limit, search, sort, from, to — plus specialization/hospital for doctors and condition/doctorId/gender for patients',
    },
  });
});

app.use('/api/v1', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);
