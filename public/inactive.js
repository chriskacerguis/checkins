// public/inactive.js
const el = (sel) => document.querySelector(sel);

const state = {
  weeks: 6,
  rows: [],
  sortKey: 'last_heard', // default sort (matches API default order)
  sortDir: 'asc',        // 'asc' | 'desc'
};

async function loadData(weeks) {
  const r = await fetch(`/api/reports/inactive?weeks=${encodeURIComponent(weeks)}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Request failed: ${r.status} ${t}`);
  }
  return r.json();
}

function fmtDate(d) {
  if (!d) return '';
  // API returns 'YYYY-MM-DD' strings; show as-is
  return d;
}

function compareValues(a, b, dir) {
  // handle null/undefined consistently
  const na = (a === null || a === undefined || a === '');
  const nb = (b === null || b === undefined || b === '');
  if (na && nb) return 0;
  if (na) return dir === 'asc' ? 1 : -1; // nulls last
  if (nb) return dir === 'asc' ? -1 : 1;

  // numeric?
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }

  // date string 'YYYY-MM-DD'?
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof a === 'string' && typeof b === 'string' && isoDate.test(a) && isoDate.test(b)) {
    // string comparison works for ISO dates
    return dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  }

  // fallback string compare (case-insensitive)
  const sa = String(a).toUpperCase();
  const sb = String(b).toUpperCase();
  return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
}

function getSortKeyValue(row, key) {
  switch (key) {
    case 'callsign': return row.callsign || '';
    case 'first_heard': return row.first_heard || '';
    case 'last_heard': return row.last_heard || '';
    case 'total_checkins': return typeof row.total_checkins === 'number' ? row.total_checkins : Number(row.total_checkins || 0);
    case 'days_since': return typeof row.days_since === 'number' ? row.days_since : Number(row.days_since || 0);
    default: return '';
  }
}

function applySorting(rows, key, dir) {
  const copy = rows.slice();
  copy.sort((r1, r2) => compareValues(getSortKeyValue(r1, key), getSortKeyValue(r2, key), dir));
  return copy;
}

function updateHeaderSortIndicators() {
  const ths = document.querySelectorAll('#inactive-table thead th.sortable');
  ths.forEach((th) => {
    const key = th.getAttribute('data-key');
    const indicator = th.querySelector('.sort-indicator');
    const active = key === state.sortKey;
    th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    if (indicator) {
      indicator.textContent = active ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
    }
  });
}

function render() {
  el('#weeks-label').textContent = state.weeks;

  const tbody = el('#inactive-table tbody');
  if (!state.rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No results.</td></tr>';
    el('#meta').textContent = '0 callsigns';
    updateHeaderSortIndicators();
    return;
  }

  const sorted = applySorting(state.rows, state.sortKey, state.sortDir);

  tbody.innerHTML = sorted.map((r) => `
    <tr>
      <td>${r.callsign ?? ''}</td>
      <td>${fmtDate(r.first_heard)}</td>
      <td>${fmtDate(r.last_heard)}</td>
      <td>${r.total_checkins ?? 0}</td>
      <td>${r.days_since ?? ''}</td>
    </tr>
  `).join('');

  el('#meta').textContent = `${sorted.length} callsigns`;
  updateHeaderSortIndicators();
}

async function refresh(weeks) {
  const tbody = el('#inactive-table tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading…</td></tr>';
  try {
    const data = await loadData(weeks);
    state.weeks = data.weeks ?? weeks;
    state.rows = Array.isArray(data.rows) ? data.rows : [];
    render();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">${String(e.message || e)}</td></tr>`;
  }
}

// Sorting handlers
function attachSortHandlers() {
  const ths = document.querySelectorAll('#inactive-table thead th.sortable');
  ths.forEach((th) => {
    const key = th.getAttribute('data-key');
    const activate = () => {
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        // sensible defaults per column
        state.sortDir = (key === 'callsign' || key === 'first_heard' || key === 'last_heard') ? 'asc' : 'desc';
      }
      render();
    };
    th.addEventListener('click', activate);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
  });
}

// Filter form
el('#filter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const weeks = Math.max(1, Math.min(520, Number(el('#weeks').value) || 6));
  refresh(weeks);
});

// Init
attachSortHandlers();
refresh(6);
