const LANG_COLORS = {
  TypeScript: '#2563eb',
  Python: '#0284c7',
  Rust: '#c2410c',
  'C++': '#be185d',
  'C#': '#15803d',
  Go: '#0891b2',
  JavaScript: '#ca8a04',
};

const WINDOW_CONFIG = {
  today: { label: "Today's News", days: 1 },
  '3d': { label: 'Past 3 Days', days: 3 },
  '1w': { label: '1 Week', days: 7 },
  '1m': { label: '1 Month', days: 30 },
};

const state = {
  data: null,
  window: 'today',
  category: 'all',
  compat: 'all',
  language: 'all',
  sort: 'stars',
  view: 'list',
  search: '',
  selectedId: null,
};

const el = {
  headerStatusText: document.getElementById('headerStatusText'),
  globalSearch: document.getElementById('globalSearch'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  inspectorBody: document.getElementById('inspectorBody'),
  windowTitle: document.getElementById('windowTitle'),
  windowMeta: document.getElementById('windowMeta'),
  kpiProjects: document.getElementById('kpiProjects'),
  kpiStars: document.getElementById('kpiStars'),
  kpiReady: document.getElementById('kpiReady'),
  kpiCoverage: document.getElementById('kpiCoverage'),
  languageBar: document.getElementById('languageBar'),
  langSelect: document.getElementById('langSelect'),
  compatSelect: document.getElementById('compatSelect'),
  sortSelect: document.getElementById('sortSelect'),
  repoGrid: document.getElementById('repoGrid'),
  baselineRatioPill: document.getElementById('baselineRatioPill'),
  openBaselineBtn: document.getElementById('openBaselineBtn'),
  closeBaselineBtn: document.getElementById('closeBaselineBtn'),
  baselineModal: document.getElementById('baselineModal'),
  baselineModalBody: document.getElementById('baselineModalBody'),
  openDeployBtn: document.getElementById('openDeployBtn'),
  closeDeployBtn: document.getElementById('closeDeployBtn'),
  deployModal: document.getElementById('deployModal'),
  exportBriefBtn: document.getElementById('exportBriefBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  toast: document.getElementById('toast'),
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function formatCompact(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

function getLangColor(lang) {
  for (const [key, color] of Object.entries(LANG_COLORS)) {
    if (lang.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#64748b';
}

function normalizeLang(lang) {
  if (!lang) return 'Other';
  if (lang.includes('/')) return lang.split('/')[0].trim();
  if (lang.includes('(')) return lang.split('(')[0].trim();
  return lang.trim();
}

function subtractDays(isoDate, daysMinusOne) {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - daysMinusOne);
  return dt.toISOString().slice(0, 10);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    showToast('Clipboard permission denied');
  }
}

function getWindowData(windowKey) {
  if (!state.data || !state.data.latestDate) {
    return { repos: [], reportsInWindow: [], startDate: '', endDate: '' };
  }

  const { reports, latestDate } = state.data;
  const days = WINDOW_CONFIG[windowKey].days;
  const startDate = subtractDays(latestDate, days - 1);
  const reportsInWindow = reports.filter((r) => r.date >= startDate && r.date <= latestDate);

  const byRepo = new Map();
  for (const report of reportsInWindow) {
    const all = [...report.popular, ...report.rising];
    for (const item of all) {
      const existing = byRepo.get(item.id);
      if (!existing) {
        byRepo.set(item.id, {
          ...item,
          seenDates: [report.date],
        });
      } else {
        existing.seenDates.push(report.date);
      }
    }
  }

  return {
    repos: [...byRepo.values()],
    reportsInWindow,
    startDate,
    endDate: latestDate,
  };
}

function getFilteredRepos(windowRepos) {
  const q = state.search.trim().toLowerCase();

  const filtered = windowRepos.filter((repo) => {
    if (state.category !== 'all' && repo.category !== state.category) return false;
    if (state.compat !== 'all' && repo.compatibility.status !== state.compat) return false;
    if (state.language !== 'all' && normalizeLang(repo.language) !== state.language) return false;

    if (q) {
      const cmdText = repo.apply.commands.map((c) => c.code).join(' ');
      const haystack = `${repo.id} ${repo.language} ${repo.summary} ${cmdText} ${repo.license}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'pushed':
        return (b.pushed || '').localeCompare(a.pushed || '');
      case 'created':
        return (b.created || '').localeCompare(a.created || '');
      case 'rank':
        if (a.category !== b.category) return a.category === 'popular' ? -1 : 1;
        return a.rank - b.rank;
      case 'ready': {
        const order = { ready: 0, prebuilt: 1, 'extra-tool': 2 };
        const diff = order[a.compatibility.status] - order[b.compatibility.status];
        return diff !== 0 ? diff : b.stars - a.stars;
      }
      case 'stars':
      default:
        return b.stars - a.stars;
    }
  });

  return filtered;
}

function renderCounts() {
  for (const key of Object.keys(WINDOW_CONFIG)) {
    const { repos } = getWindowData(key);
    const badge = document.getElementById(`badge-${key}`);
    if (badge) badge.textContent = String(repos.length);
  }

  const { repos } = getWindowData(state.window);
  document.getElementById('cat-all').textContent = String(repos.length);
  document.getElementById('cat-popular').textContent = String(
    repos.filter((r) => r.category === 'popular').length
  );
  document.getElementById('cat-rising').textContent = String(
    repos.filter((r) => r.category === 'rising').length
  );
}

function renderBaselineModal() {
  const baseline = state.data?.baseline || [];
  const installedCount = baseline.filter((t) => t.installed).length;
  el.baselineRatioPill.textContent = `${installedCount} / ${baseline.length} tools active`;

  el.baselineModalBody.innerHTML = `
    <table class="baseline-table">
      <thead>
        <tr>
          <th>Tool</th>
          <th>Status</th>
          <th>Observed Version / Notes</th>
        </tr>
      </thead>
      <tbody>
        ${baseline
          .map(
            (t) => `
          <tr>
            <td><strong>${escapeHtml(t.tool)}</strong></td>
            <td><span class="${t.installed ? 'status-ok' : 'status-missing'}">${escapeHtml(t.status)}</span></td>
            <td>${escapeHtml(t.notes)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderLanguageControls(windowRepos) {
  const counts = new Map();
  for (const r of windowRepos) {
    const lang = normalizeLang(r.language);
    counts.set(lang, (counts.get(lang) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = windowRepos.length || 1;

  el.languageBar.innerHTML = sorted
    .map(([lang, count]) => {
      const pct = ((count / total) * 100).toFixed(2);
      return `<div class="lang-segment" style="width:${pct}%;background:${getLangColor(lang)}" title="${escapeHtml(lang)}: ${count}"></div>`;
    })
    .join('');

  const currentLang = state.language;
  el.langSelect.innerHTML = [
    `<option value="all">All Languages (${windowRepos.length})</option>`,
    ...sorted.map(
      ([lang, count]) =>
        `<option value="${escapeHtml(lang)}">${escapeHtml(lang)} (${count})</option>`
    ),
  ].join('');
  el.langSelect.value = sorted.some(([l]) => l === currentLang) ? currentLang : 'all';
}

function renderLedger(filteredRepos) {
  if (filteredRepos.length === 0) {
    el.repoGrid.innerHTML = `
      <div class="empty-state">
        <p>No repositories match your current filters in this time horizon.</p>
      </div>
    `;
    return;
  }

  el.repoGrid.innerHTML = filteredRepos
    .map((repo) => {
      const isSelected = repo.id === state.selectedId;
      const langColor = getLangColor(repo.language);
      const catClass = repo.category === 'popular' ? 'pill-popular' : 'pill-rising';
      const catLabel = repo.category === 'popular' ? 'Popular' : 'Rising';
      const compatClass = `compat-${repo.compatibility.status}`;

      return `
        <article class="ledger-row ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(repo.id)}">
          <div class="row-header">
            <div class="row-title-wrap">
              <span class="row-rank">#${repo.rank}</span>
              <span class="row-repo-name">${escapeHtml(repo.id)}</span>
            </div>
            <div class="row-badges">
              <span class="pill ${catClass}">${catLabel}</span>
              <span class="pill ${compatClass}">${escapeHtml(repo.compatibility.statusLabel)}</span>
            </div>
          </div>

          <p class="row-summary">${escapeHtml(repo.summary)}</p>

          <div class="row-meta">
            <span class="meta-item">
              <span class="lang-dot" style="background:${langColor}"></span>
              ${escapeHtml(repo.language)}
            </span>
            <span class="meta-item">${formatNumber(repo.stars)} stars</span>
            <span class="meta-item">${formatNumber(repo.forks)} forks</span>
            <span class="meta-item">License: ${escapeHtml(repo.license)}</span>
            ${
              repo.seenDates.length > 1
                ? `<span class="meta-item">Seen ${repo.seenDates.length}d</span>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  el.repoGrid.querySelectorAll('.ledger-row').forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedId = row.dataset.id;
      render();
    });
  });
}

function renderBrief(allWindowRepos) {
  const repo = allWindowRepos.find((r) => r.id === state.selectedId);
  if (!repo) {
    el.inspectorBody.innerHTML = `
      <div class="brief-empty">
        <p>Select any repository from the intelligence ledger to review its license, activity metrics, and verified deployment instructions.</p>
      </div>
    `;
    return;
  }

  const commandsHtml = repo.apply.commands
    .map(
      (cmd, idx) => `
      <div class="code-block-card">
        <div class="code-block-bar">
          <span>${escapeHtml(cmd.lang || 'powershell')}</span>
          <button type="button" class="copy-mini-btn" data-cmd-idx="${idx}">Copy</button>
        </div>
        <pre class="code-block-pre"><code>${escapeHtml(cmd.code)}</code></pre>
      </div>
    `
    )
    .join('');

  const notesHtml = repo.apply.notes.length
    ? `<ul class="brief-notes">${repo.apply.notes
        .map((n) => `<li>${escapeHtml(n.replace(/`/g, ''))}</li>`)
        .join('')}</ul>`
    : '';

  const toolsHtml = [
    ...repo.compatibility.usesTools.map(
      (t) => `<span class="tool-chip installed">${escapeHtml(t)}</span>`
    ),
    ...repo.compatibility.missingDeps.map(
      (t) => `<span class="tool-chip missing">${escapeHtml(t)}</span>`
    ),
  ].join('');

  el.inspectorBody.innerHTML = `
    <div class="brief-head">
      <h2>${escapeHtml(repo.id)}</h2>
      <a class="brief-link" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(repo.url)}</span>
      </a>
    </div>

    <div class="brief-spec-grid">
      <div class="brief-spec-cell">
        <span class="brief-spec-label">Stars / Forks</span>
        <span class="brief-spec-val">${formatNumber(repo.stars)} / ${formatNumber(repo.forks)}</span>
      </div>
      <div class="brief-spec-cell">
        <span class="brief-spec-label">Language &amp; License</span>
        <span class="brief-spec-val">${escapeHtml(repo.language)} · ${escapeHtml(repo.license)}</span>
      </div>
      <div class="brief-spec-cell">
        <span class="brief-spec-label">Created</span>
        <span class="brief-spec-val">${escapeHtml(repo.created || '—')}</span>
      </div>
      <div class="brief-spec-cell">
        <span class="brief-spec-label">Last Pushed</span>
        <span class="brief-spec-val">${escapeHtml(repo.pushed || '—')}</span>
      </div>
      ${
        repo.release
          ? `<div class="brief-spec-cell" style="grid-column: 1 / -1;">
              <span class="brief-spec-label">Latest Release</span>
              <span class="brief-spec-val">${escapeHtml(repo.release)}</span>
            </div>`
          : ''
      }
    </div>

    <div class="brief-section">
      <h3>Executive Summary</h3>
      <p class="brief-summary-text">${escapeHtml(repo.summary)}</p>
    </div>

    <div class="brief-section">
      <h3>Toolchain Audit</h3>
      <div class="toolchain-list">${toolsHtml}</div>
    </div>

    <div class="brief-section">
      <h3>Verified Deployment Instructions</h3>
      ${notesHtml}
      ${commandsHtml}
    </div>

    <div class="brief-section">
      <h3>Report Appearances (${repo.seenDates.length})</h3>
      <div class="toolchain-list">
        ${repo.seenDates.map((d) => `<span class="tool-chip installed">${escapeHtml(d)}</span>`).join('')}
      </div>
    </div>
  `;

  el.inspectorBody.querySelectorAll('[data-cmd-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.cmdIdx);
      const code = repo.apply.commands[idx]?.code || '';
      copyText(code);
    });
  });
}

function exportExecutiveBrief() {
  if (!state.data) return;
  const cfg = WINDOW_CONFIG[state.window];
  const { repos } = getWindowData(state.window);
  const filtered = getFilteredRepos(repos);

  const lines = [
    `# StackPulse — Executive Open-Source Brief (${cfg.label})`,
    `Generated: ${new Date().toISOString()}`,
    `Tracked Repositories: ${filtered.length}`,
    '',
    ...filtered.map(
      (r, i) =>
        `${i + 1}. **${r.id}** (${formatNumber(r.stars)} stars · ${r.language} · ${r.license}) — ${r.compatibility.statusLabel}\n   ${r.summary}\n   URL: ${r.url}`
    ),
  ];

  const blob = new Blob([lines.join('\n\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stackpulse-brief-${state.window}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported Executive Brief (.md)');
}

function render() {
  if (!state.data) return;

  const cfg = WINDOW_CONFIG[state.window];
  const { repos, reportsInWindow, startDate, endDate } = getWindowData(state.window);
  const filtered = getFilteredRepos(repos);

  if (!filtered.some((r) => r.id === state.selectedId)) {
    state.selectedId = filtered.length > 0 ? filtered[0].id : null;
  }

  el.windowTitle.textContent = cfg.label;
  const rangeText = startDate === endDate ? endDate : `${startDate} to ${endDate}`;
  el.windowMeta.textContent = `Anchor: ${rangeText || '—'} · ${reportsInWindow.length} report(s)`;
  el.headerStatusText.textContent = `Live Intelligence · Latest ${state.data.latestDate || '—'} · ${state.data.reportCount} Daily Briefings`;

  const totalStars = filtered.reduce((acc, r) => acc + r.stars, 0);
  const readyCount = filtered.filter((r) => r.compatibility.status === 'ready').length;

  el.kpiProjects.textContent = String(filtered.length);
  el.kpiStars.textContent = formatCompact(totalStars);
  el.kpiReady.textContent = String(readyCount);
  el.kpiCoverage.textContent = `${reportsInWindow.length} / ${cfg.days}d`;

  renderCounts();
  renderBaselineModal();
  renderLanguageControls(repos);
  renderLedger(filtered);
  renderBrief(repos);
}

function isLocalNodeServer() {
  return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
}

async function fetchReports(notify = false) {
  let payload = null;
  if (isLocalNodeServer()) {
    try {
      const res = await fetch('./api/reports', { cache: 'no-store' });
      if (res.ok) payload = await res.json();
    } catch {
      // Fallback to static build data
    }
  }

  if (!payload) {
    const staticRes = await fetch('./data/reports.json', { cache: 'no-store' });
    if (!staticRes.ok) throw new Error(`HTTP ${staticRes.status}`);
    payload = await staticRes.json();
  }

  state.data = payload;
  render();
  if (notify) showToast(`Synced ${state.data.reportCount} report(s)`);
}

function connectLiveUpdates() {
  if (!isLocalNodeServer() || typeof EventSource === 'undefined') return;
  try {
    const es = new EventSource('./api/events');
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'reports-updated') {
          fetchReports(false).then(() => {
            showToast(`Auto-updated from ${msg.file}`);
          });
        }
      } catch {
        // Ignore malformed event
      }
    };
    es.onerror = () => es.close();
  } catch {
    // Static host without SSE
  }

  setInterval(() => {
    fetchReports(false).catch(() => {});
  }, 60_000);
}

function bindEvents() {
  document.querySelectorAll('[data-window]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-window]').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.window = btn.dataset.window;
      state.language = 'all';
      render();
    });
  });

  document.querySelectorAll('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-category]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.category;
      render();
    });
  });

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;
      el.repoGrid.classList.toggle('cards-mode', state.view === 'cards');
    });
  });

  el.compatSelect.addEventListener('change', () => {
    state.compat = el.compatSelect.value;
    render();
  });

  el.langSelect.addEventListener('change', () => {
    state.language = el.langSelect.value;
    render();
  });

  el.sortSelect.addEventListener('change', () => {
    state.sort = el.sortSelect.value;
    render();
  });

  el.globalSearch.addEventListener('input', () => {
    state.search = el.globalSearch.value;
    el.clearSearchBtn.classList.toggle('hidden', !state.search);
    render();
  });

  el.clearSearchBtn.addEventListener('click', () => {
    state.search = '';
    el.globalSearch.value = '';
    el.clearSearchBtn.classList.add('hidden');
    render();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      el.globalSearch.focus();
    } else if (e.key === 'Escape') {
      el.baselineModal.classList.add('hidden');
      el.deployModal.classList.add('hidden');
    }
  });

  el.openBaselineBtn.addEventListener('click', () => el.baselineModal.classList.remove('hidden'));
  el.closeBaselineBtn.addEventListener('click', () => el.baselineModal.classList.add('hidden'));
  el.baselineModal.addEventListener('click', (e) => {
    if (e.target === el.baselineModal) el.baselineModal.classList.add('hidden');
  });

  el.openDeployBtn.addEventListener('click', () => el.deployModal.classList.remove('hidden'));
  el.closeDeployBtn.addEventListener('click', () => el.deployModal.classList.add('hidden'));
  el.deployModal.addEventListener('click', (e) => {
    if (e.target === el.deployModal) el.deployModal.classList.add('hidden');
  });

  el.exportBriefBtn.addEventListener('click', exportExecutiveBrief);
  el.refreshBtn.addEventListener('click', () => fetchReports(true));
}

bindEvents();
connectLiveUpdates();
fetchReports().catch((err) => {
  el.repoGrid.innerHTML = `<div class="empty-state">Failed to load reports: ${escapeHtml(err.message)}</div>`;
});
