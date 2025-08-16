import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

export function security(app) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          // allow same-origin scripts and Bootstrap from jsdelivr CDN
          "script-src": ["'self'", "https://cdn.jsdelivr.net"],
          // allow same-origin styles and Bootstrap CSS from jsdelivr
          "style-src": ["'self'", "https://cdn.jsdelivr.net"],
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "base-uri": ["'self'"],
          "frame-ancestors": ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" }
    })
  );

  app.use(cors({ origin: true, credentials: true }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false
    })
  );
}
