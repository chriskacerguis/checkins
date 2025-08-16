/**
 * Robust parser for net log files.
 * Handles:
 *  - Date lines like "05/25/2025" or titles like "TCARES Training Net 07/27/25"
 *  - Start/Stop variants: "Start:", "Start time:", "Stop:", "End time:", with optional tz
 *  - Rows "n|CALLSIGN|..."
 */

function toISOFromUS(month, day, year) {
  const y = String(year).length === 2 ? 2000 + Number(year) : Number(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function findDateInText(text) {
  // Match M/D/YY, MM/DD/YYYY, M-D-YY, etc.
  const m = text.match(/(\b\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
  if (!m) return null;
  const [, mm, dd, yy] = m;
  return toISOFromUS(mm, dd, yy);
}

function parseStart(text) {
  // Accept "Start: 1900", "Start time: 1900 CST", "Start 1900"
  const m = text.match(/\bstart(?:\s*time)?\b[^0-9]*([0-2]?\d{3,4})/i);
  return m ? m[1].replace(/[^\d]/g, '') : null;
}

function parseStopOrEnd(text) {
  // Accept "Stop: 1939", "End time: 1928 CST", "Stop 1927"
  const m = text.match(/\b(?:stop|end(?:\s*time)?)\b[^0-9]*([0-2]?\d{3,4})/i);
  return m ? m[1].replace(/[^\d]/g, '') : null;
}

function parseDuration(text) {
  // Accept "Duration: 39 mins." or "Duration 39 min"
  const m = text.match(/duration[:\s]*([0-9]{1,3})\s*min/i);
  return m ? parseInt(m[1], 10) : null;
}

function parseHeader(lines) {
  const hdr = { session_date: null, start: null, stop: null, duration: null };

  // Look into the first few non-empty lines for date/time metadata
  const lookahead = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (t) lookahead.push(t);
    if (lookahead.length >= 10) break;
  }

  // Date in any of the first lines (title or dedicated date line)
  for (const t of lookahead) {
    const iso = findDateInText(t);
    if (iso) { hdr.session_date = iso; break; }
  }

  // Legacy: if first line is only a date
  if (!hdr.session_date && lines.length) {
    const t = lines[0].trim();
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(t)) {
      const iso = findDateInText(t);
      if (iso) hdr.session_date = iso;
    }
  }

  // Find Start / Stop / Duration variants
  for (const t of lookahead) {
    if (!hdr.start) hdr.start = parseStart(t);
    if (!hdr.stop) hdr.stop = parseStopOrEnd(t);
    if (!hdr.duration) hdr.duration = parseDuration(t);
  }

  // Clean up blank leading lines before entries
  while (lines.length && !lines[0].trim()) lines.shift();

  return hdr;
}

function deriveCommentAndTags(tokens) {
  const cleaned = tokens.map((t) => t.trim()).filter(Boolean);
  const tagLike = cleaned.filter((t) => /^\(.*\)$/.test(t));
  let comment = null;
  for (const tok of cleaned) {
    if (!/^\(.*\)$/.test(tok) && /[A-Za-z]/.test(tok)) {
      if (!comment || tok.length > comment.length) comment = tok;
    }
  }
  return { comment, tags: tagLike };
}

export function parseLog(text) {
  const lines = text.split(/\r?\n/);
  const header = parseHeader(lines);

  const entries = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    const m = line.match(/^\s*(\d+)\s*\|(.*)$/);
    if (!m) continue;
    const rowNumber = parseInt(m[1], 10);
    const rest = m[2].split('|');
    const callsign = (rest[0] || '').trim() || null;
    const tokens = rest.slice(1).map((s) => s.trim());
    const { comment, tags } = deriveCommentAndTags(tokens);
    entries.push({
      row_number: rowNumber,
      callsign,
      comment,
      tags,
      tokens,
      raw_line: line,
    });
  }

  return { header, entries };
}
