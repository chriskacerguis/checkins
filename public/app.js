// ---- Helpers ----
const el = (sel) => document.querySelector(sel);

/** Build a Bootstrap pager into target element */
function buildPager(targetUl, total, page, pageSize, onPage) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const items = [];

  const prevDisabled = page <= 1 ? ' disabled' : '';
  items.push(
    `<li class="page-item${prevDisabled}">
       <a class="page-link" href="#" data-page="${page - 1}" aria-label="Previous">&laquo;</a>
     </li>`
  );

  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);

  if (start > 1) {
    items.push(`<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`);
    if (start > 2) items.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
  }

  for (let p = start; p <= end; p++) {
    const active = p === page ? ' active' : '';
    items.push(`<li class="page-item${active}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) items.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
    items.push(`<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`);
  }

  const nextDisabled = page >= totalPages ? ' disabled' : '';
  items.push(
    `<li class="page-item${nextDisabled}">
       <a class="page-link" href="#" data-page="${page + 1}" aria-label="Next">&raquo;</a>
     </li>`
  );

  targetUl.innerHTML = items.join('');
  targetUl.querySelectorAll('a.page-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const newPage = Number(a.dataset.page);
      if (Number.isFinite(newPage)) onPage(Math.max(1, newPage));
    });
  });
}

// ---- Upload ----
const fileInput = el('#file');
const uploadForm = el('#upload-form');
const uploadResult = el('#upload-result');

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fileInput.files.length) return alert('Select a file first.');
  const f = fileInput.files[0];
  const fd = new FormData();
  fd.append('file', f);
  uploadResult.textContent = 'Uploading…';

  try {
    const q = new URLSearchParams({ filename: f.name });
    const resp = await fetch('/api/ingest?' + q.toString(), { method: 'POST', body: fd });
    const data = await resp.json();
    uploadResult.textContent = JSON.stringify(data, null, 2);

    // Refresh lists after ingest; reset to first page
    sessionsState.page = 1;
    checkinsState.page = 1;
    refreshSessions();
    refreshCheckins();
  } catch (err) {
    uploadResult.textContent = String(err);
  }
});

// ---- Sessions (paginated) ----
const sessionsState = {
  page: 1,
  pageSize: 10,
  total: 0,
};

const sessionsForm = el('#sessions-form');
const sessionsPageSize = el('#sessionsPageSize');
const sessionsMeta = el('#sessions-meta');
const sessionsPager = el('#sessions-pager');

sessionsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sessionsState.pageSize = Number(sessionsPageSize.value) || 10;
  sessionsState.page = 1;
  refreshSessions();
});

el('#refresh-sessions').addEventListener('click', (e) => {
  e.preventDefault();
  refreshSessions();
});

async function refreshSessions() {
  const tbody = el('#sessions-table tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading…</td></tr>';

  const params = new URLSearchParams({
    page: String(sessionsState.page),
    pageSize: String(sessionsState.pageSize),
  });

  const r = await fetch('/api/sessions?' + params.toString());
  const data = await r.json();

  sessionsState.total = data.total ?? 0;
  sessionsState.page = data.page ?? sessionsState.page;
  sessionsState.pageSize = data.pageSize ?? sessionsState.pageSize;

  if (!data.rows || data.rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No sessions.</td></tr>';
  } else {
    tbody.innerHTML = data.rows
      .map(
        (s) => `
        <tr>
          <td>${s.id}</td>
          <td>${s.session_date ?? ''}</td>
          <td>${s.start_time ?? ''}</td>
          <td>${s.stop_time ?? ''}</td>
          <td>${s.duration_minutes ?? ''}</td>
          <td>${s.source_filename ?? ''}</td>
        </tr>
      `
      )
      .join('');
  }

  const startIdx = sessionsState.total === 0 ? 0 : (sessionsState.page - 1) * sessionsState.pageSize + 1;
  const endIdx = Math.min(sessionsState.total, sessionsState.page * sessionsState.pageSize);
  sessionsMeta.textContent = `Showing ${startIdx}-${endIdx} of ${sessionsState.total}`;

  buildPager(sessionsPager, sessionsState.total, sessionsState.page, sessionsState.pageSize, (newPage) => {
    sessionsState.page = newPage;
    refreshSessions();
  });
}

// ---- Check-ins (paginated) ----
const checkinsState = {
  callsign: '',
  page: 1,
  pageSize: 25,
  total: 0,
};

const filterForm = el('#filter-form');
const callsignInput = el('#callsign');
const pageSizeSelect = el('#pageSize');
const checkinsMeta = el('#checkins-meta');
const checkinsPager = el('#checkins-pager');

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  checkinsState.callsign = callsignInput.value.trim().toUpperCase();
  checkinsState.pageSize = Number(pageSizeSelect.value) || 25;
  checkinsState.page = 1;
  refreshCheckins();
});

async function refreshCheckins() {
  const tbody = el('#checkins-table tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading…</td></tr>';

  const params = new URLSearchParams();
  if (checkinsState.callsign) params.set('callsign', checkinsState.callsign);
  params.set('page', String(checkinsState.page));
  params.set('pageSize', String(checkinsState.pageSize));

  const r = await fetch('/api/checkins?' + params.toString());
  const data = await r.json();

  checkinsState.total = data.total ?? 0;
  checkinsState.page = data.page ?? checkinsState.page;
  checkinsState.pageSize = data.pageSize ?? checkinsState.pageSize;

  if (!data.rows || data.rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No results.</td></tr>';
  } else {
    tbody.innerHTML = data.rows
      .map(
        (c) => `
        <tr>
          <td>${c.session_id}</td>
          <td>${c.row_number ?? ''}</td>
          <td>${c.callsign ?? ''}</td>
          <td>${c.comment ?? ''}</td>
          <td>${Array.isArray(c.tags) ? c.tags.join(', ') : ''}</td>
        </tr>
      `
      )
      .join('');
  }

  const startIdx = checkinsState.total === 0 ? 0 : (checkinsState.page - 1) * checkinsState.pageSize + 1;
  const endIdx = Math.min(checkinsState.total, checkinsState.page * checkinsState.pageSize);
  checkinsMeta.textContent = `Showing ${startIdx}-${endIdx} of ${checkinsState.total}`;

  buildPager(checkinsPager, checkinsState.total, checkinsState.page, checkinsState.pageSize, (newPage) => {
    checkinsState.page = newPage;
    refreshCheckins();
  });
}

// Initial loads
refreshSessions();
refreshCheckins();
