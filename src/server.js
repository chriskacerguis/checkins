import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './db.js';
import fs from 'fs';
import http from 'http';
import https from 'https';

const app = buildApp();

// Optional HTTPS server (if SSL paths are provided)
const keyPath = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;
const forceHttps =
  String(process.env.FORCE_HTTPS || 'false').toLowerCase() === 'true';

let server;
if (
  keyPath &&
  certPath &&
  fs.existsSync(keyPath) &&
  fs.existsSync(certPath)
) {
  const creds = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  server = https.createServer(creds, app).listen(env.PORT, () => {
    logger.info(`HTTPS server listening on :${env.PORT}`);
  });

  if (forceHttps) {
    // Also start an HTTP redirect server on PORT-1 (e.g., 2999 if HTTPS on 3000)
    const httpPort = env.PORT - 1 > 0 ? env.PORT - 1 : 80;
    http
      .createServer((req, res) => {
        const host = req.headers.host
          ? req.headers.host.replace(/:\d+$/, '')
          : 'localhost';
        res.writeHead(301, {
          Location: `https://${host}:${env.PORT}${req.url}`,
        });
        res.end();
      })
      .listen(httpPort, () =>
        logger.info(`HTTP redirect server on :${httpPort}`)
      );
  }
} else {
  // Plain HTTP (default dev mode)
  server = app.listen(env.PORT, () => {
    logger.info(`HTTP server listening on :${env.PORT}`);
  });
}

async function shutdown(signal) {
  logger.warn({ signal }, 'Shutting down...');
  server.close(async () => {
    try {
      await pool.end();
      logger.info('Postgres pool closed');
    } catch (e) {
      logger.error({ e }, 'Error closing Postgres pool');
    } finally {
      process.exit(0);
    }
  });
}

['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => shutdown(sig))
);
