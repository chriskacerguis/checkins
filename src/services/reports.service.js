// src/services/reports.service.js
export async function getInactiveOperators(weeks = 6) {
  const { pool } = await import('../db.js');

  // Coerce/guard
  const w = Number.isFinite(Number(weeks)) ? Math.max(1, Math.min(520, Number(weeks))) : 6;

  const sql = `
    WITH norm AS (
      SELECT
        UPPER(TRIM(c.callsign)) AS callsign,
        s.session_date
      FROM checkins c
      JOIN sessions s ON s.id = c.session_id
      WHERE c.callsign IS NOT NULL AND TRIM(c.callsign) <> ''
    ),
    agg AS (
      SELECT
        callsign,
        MIN(session_date) AS first_heard,
        MAX(session_date) AS last_heard,
        COUNT(*)         AS total_checkins
      FROM norm
      GROUP BY callsign
    )
    SELECT
      callsign,
      first_heard,
      last_heard,
      total_checkins,
      (CURRENT_DATE - last_heard) AS days_since
    FROM agg
    WHERE last_heard <= CURRENT_DATE - ($1::int * INTERVAL '1 week')
    ORDER BY last_heard ASC, callsign;
  `;

  const { rows } = await pool.query(sql, [w]);
  return { weeks: w, rows };
}
