# Express Check-ins Ingest App (Best-Practice Layout)

This is a production-ready Express app layout with:

- **Config & env validation** (`src/config/env.js` with Zod)
- **Structured logging** (Pino) and graceful shutdown
- **Security & limits** (Helmet, CORS, express-rate-limit)
- **Clear layering** (routes → controllers → services → db)
- **Central error handling** and async wrapper
- **Static web UI** for uploads and simple browsing
- **Dockerized app + Postgres**
- **Lint/format** via ESLint + Prettier

## Project Structure

```
src/
  app.js                 # express app builder
  server.js              # start & shutdown
  config/
    env.js               # loads & validates env
    logger.js            # pino logger
  middlewares/
    security.js          # helmet, cors, rate-limiter
    errorHandler.js      # notFound + errorHandler
    upload.js            # multer config
  routes/
    index.js             # /api mount
    ingest.routes.js     # /api/ingest, /api/sessions, /api/checkins
  controllers/
    ingest.controller.js
  services/
    ingest.service.js
  utils/
    parser.js            # log parser
    asyncHandler.js
  migrate.js             # runs schema.sql
public/
  index.html
  styles.css
schema.sql
Dockerfile
docker-compose.yml
```

## Run locally

```bash
docker compose up -d db
npm install
cp .env.example .env
npm run migrate
npm run dev
# open http://localhost:3000
```

### API Base Path

- Health: `GET /health`
- **Web UI**: `GET /`
- API routes are under `/api`:
  - `POST /api/ingest` (multipart `file`)
  - `GET /api/sessions`
  - `GET /api/checkins?callsign=KD5YVG`
```

## Notes

- The parser is defensive for your standard log format and preserves all tokens in JSONB.
- You can extend services/controllers without touching routing or DB glue.
