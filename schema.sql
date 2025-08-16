CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  session_date DATE NOT NULL,
  start_time TIME,
  stop_time TIME,
  duration_minutes INTEGER,
  source_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkins (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  row_number INTEGER,
  callsign TEXT,
  comment TEXT,
  tags TEXT[],
  tokens JSONB,
  raw_line TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_session ON checkins(session_id);
CREATE INDEX IF NOT EXISTS idx_checkins_callsign ON checkins(callsign);
CREATE INDEX IF NOT EXISTS idx_checkins_tags ON checkins USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_checkins_tokens ON checkins USING GIN (tokens);
