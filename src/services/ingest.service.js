import { withTx } from '../db.js';
import { parseLog } from '../utils/parser.js';

function toTime(hhmm) {
  const s = String(hhmm || '').replace(/[^\d]/g, '').padStart(4, '0');
  if (!/^[0-2]\d[0-5]\d$/.test(s)) return null;
  return `${s.slice(0, 2)}:${s.slice(2, 4)}:00`;
}

function tryDateFromFilename(name) {
  if (!name) return null;
  // Match MM-DD-YYYY or M-D-YYYY anywhere in filename
  const m = String(name).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    const pad = (n) => String(n).padStart(2, '0');
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
  }
  // Also support MM_DD_YYYY just in case
  const m2 = String(name).match(/(\d{1,2})_(\d{1,2})_(\d{4})/);
  if (m2) {
    const [, mm, dd, yyyy] = m2;
    const pad = (n) => String(n).padStart(2, '0');
    return `${yyyy}-${pad(mm)}-${pad(dd)}`;
  }
  return null;
}

export async function ingestLog(buffer, filename) {
  const text = buffer.toString('utf-8');
  const { header, entries } = parseLog(text);

  // Fallback: derive date from filename when header lacks a date
  let sessionDate = header.session_date || tryDateFromFilename(filename);

  if (!sessionDate) {
    const err = new Error(
      'Could not determine session date from header or filename. ' +
      'Please include a date like MM/DD/YYYY in the header, or use a filename with MM-DD-YYYY.'
    );
    err.statusCode = 400;
    throw err;
  }

  return await withTx(async (client) => {
    const insSession = await client.query(
      `INSERT INTO sessions (session_date, start_time, stop_time, duration_minutes, source_filename)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        sessionDate,
        header.start ? toTime(header.start) : null,
        header.stop ? toTime(header.stop) : null,
        header.duration ?? null,
        filename,
      ]
    );
    const sessionId = insSession.rows[0].id;

    const insertSQL = `INSERT INTO checkins
      (session_id, row_number, callsign, comment, tags, tokens, raw_line)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`;

    for (const e of entries) {
      await client.query(insertSQL, [
        sessionId,
        e.row_number ?? null,
        e.callsign ?? null,
        e.comment ?? null,
        e.tags?.length ? e.tags : null,
        JSON.stringify(e.tokens ?? []),
        e.raw_line ?? null,
      ]);
    }

    return { session_id: sessionId, inserted: entries.length, header: { ...header, session_date: sessionDate } };
  });
}

/**
 * Paginated check-in listing.
 */
export async function listCheckins(callsign, page = 1, pageSize = 25) {
  const { pool } = await import('../db.js');

  const p = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const size = Number.isFinite(Number(pageSize))
    ? Math.min(200, Math.max(1, Number(pageSize)))
    : 25;

  const filters = [];
  const params = [];
  if (callsign) {
    params.push(String(callsign).toUpperCase());
    filters.push(`callsign = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS cnt FROM checkins ${where}`;
  const { rows: cntRows } = await pool.query(countSql, params);
  const total = cntRows[0]?.cnt ?? 0;

  params.push(size);
  params.push((p - 1) * size);
  const dataSql = `
    SELECT *
    FROM checkins
    ${where}
    ORDER BY session_id DESC, row_number ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await pool.query(dataSql, params);

  return { rows, page: p, pageSize: size, total };
}

/**
 * Paginated sessions listing.
 */
export async function listSessions(page = 1, pageSize = 10) {
  const { pool } = await import('../db.js');

  const p = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const size = Number.isFinite(Number(pageSize))
    ? Math.min(200, Math.max(1, Number(pageSize)))
    : 10;

  const { rows: cntRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM sessions`
  );
  const total = cntRows[0]?.cnt ?? 0;

  const params = [size, (p - 1) * size];
  const { rows } = await pool.query(
    `SELECT *
     FROM sessions
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );

  return { rows, page: p, pageSize: size, total };
}
