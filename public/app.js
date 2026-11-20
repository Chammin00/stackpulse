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
  today: { label: 'Today (24h)', days: 1 },
  '3d': { label: 'Past 3 Days', days: 3 },
  '1w': { label: '1 Week', days: 7 },
  '1m': { label: '1 Month', days: 30 },
};

const STORAGE_KEYS = {
  upvotes: 'fnt_upvotes_v1',
  saved: 'fnt_saved_v1',
  reviewed: 'fnt_reviewed_v1',
};

function loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // Ignore storage quota errors
  }
}

const PAGE_SIZE = 10;

const state = {
  data: null,
  window: 'today',
  category: 'all',
  goal: 'all',
  topic: 'all',
  language: 'all',
  sort: 'stars-desc',
  view: 'list',
  search: '',
  page: 1,
  selectedId: null,
  upvotes: loadSet(STORAGE_KEYS.upvotes),
  saved: loadSet(STORAGE_KEYS.saved),
  reviewed: loadSet(STORAGE_KEYS.reviewed),
};

const el = {
  headerStatusText: document.getElementById('headerStatusText'),
  globalSearch: document.getElementById('globalSearch'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  resetGoalBtn: document.getElementById('resetGoalBtn'),
  goalSpotlight: document.getElementById('goalSpotlight'),
  stackBuilderCount: document.getElementById('stackBuilderCount'),
  stackChipsWrap: document.getElementById('stackChipsWrap'),
  stackScriptPreview: document.getElementById('stackScriptPreview'),
  copyStackScriptBtn: document.getElementById('copyStackScriptBtn'),
  downloadStackScriptBtn: document.getElementById('downloadStackScriptBtn'),
  rightInspector: document.getElementById('rightInspector'),
  closeMobileBriefBtn: document.getElementById('closeMobileBriefBtn'),
  inspectorBody: document.getElementById('inspectorBody'),
  windowMeta: document.getElementById('windowMeta'),
  altSelect: document.getElementById('altSelect'),
  altResultBox: document.getElementById('altResultBox'),
  altEcosystemMeta: document.getElementById('altEcosystemMeta'),
  kpiReviewed: document.getElementById('kpiReviewed'),
  languageBar: document.getElementById('languageBar'),
  langSelect: document.getElementById('langSelect'),
  topicSelect: document.getElementById('topicSelect'),
  sortSelect: document.getElementById('sortSelect'),
  repoGrid: document.getElementById('repoGrid'),
  paginationBar: document.getElementById('paginationBar'),
  digestBtn: document.getElementById('digestBtn'),
  digestModal: document.getElementById('digestModal'),
  closeDigestBtn: document.getElementById('closeDigestBtn'),
  digestModalBody: document.getElementById('digestModalBody'),
  digestSubtitle: document.getElementById('digestSubtitle'),
  installAppBtn: document.getElementById('installAppBtn'),
  exportBriefBtn: document.getElementById('exportBriefBtn'),
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

function classifyTopic(repo) {
  const text = `${repo.id} ${repo.summary}`.toLowerCase();
  if (text.includes('vr') || text.includes('webxr') || text.includes('openxr') || text.includes('webgpu') || text.includes('3d') || text.includes('shader')) {
    return 'VR & Spatial 3D';
  }
  if (text.includes('emulator') || text.includes('ps5') || text.includes('ps4') || text.includes('rpcs3') || text.includes('game') || text.includes('frame generation') || text.includes('controller')) {
    return 'Gaming & Emulators';
  }
  if (text.includes('agent') || text.includes('llm') || text.includes('deepseek') || text.includes('ai ') || text.includes('inference')) {
    return 'AI & Agents';
  }
  if (text.includes('video') || text.includes('photo') || text.includes('render') || text.includes('font') || text.includes('typeface')) {
    return 'Graphics & Media';
  }
  if (text.includes('offline') || text.includes('self-hosted') || text.includes('local') || text.includes('gateway')) {
    return 'Local-First';
  }
  if (text.includes('battery') || text.includes('docker') || text.includes('converter') || text.includes('windows')) {
    return 'System Utilities';
  }
  return 'Dev Tools';
}

function getPrimaryCommand(repo) {
  const raw = repo.apply?.commands?.[0]?.code || '';
  if (!raw) return '';
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('Set-Location'));
  return lines[0] || raw.split(/\r?\n/)[0].trim();
}

function getAvatarUrl(owner) {
  return `https://github.com/${encodeURIComponent(owner)}.png?size=80`;
}

function buildSparklineSvg(repo, strokeColor) {
  const seed = Math.max(1, repo.stars % 100);
  const pts = [
    20 - (seed % 5),
    18 - ((seed * 3) % 7),
    15 - ((seed * 2) % 6),
    11 - (seed % 5),
    7 - (repo.category === 'rising' ? 3 : 1),
    3,
  ];
  const coords = pts.map((y, idx) => `${idx * 16},${Math.max(2, Math.min(22, y))}`).join(' ');
  return `
    <svg class="sparkline-svg" viewBox="0 0 84 24" fill="none" aria-hidden="true">
      <polyline points="${coords}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
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
          topic: classifyTopic(item),
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

const GOAL_CONFIG = {
  'local-ai': {
    title: 'Run Local AI Agents',
    subtitle: 'Self-hosted agent gateways, terminal coding CLIs, and local LLM optimization.',
    envNote: 'Ready on Node.js v24.20.0 + Python 3.12.10 + uv 0.12.5 (no Docker required).',
    picks: [
      {
        id: 'openclaw/openclaw',
        url: 'https://github.com/openclaw/openclaw',
        meta: 'TypeScript · Gateway',
        desc: 'Local-first AI assistant gateway bridging 20+ messaging channels with swappable models.',
        cmd: 'npm install -g openclaw@latest --allow-scripts=openclaw',
      },
      {
        id: 'NousResearch/hermes-agent',
        url: 'https://github.com/NousResearch/hermes-agent',
        meta: 'Python · Self-Improving',
        desc: 'Native Windows PowerShell agent with FTS5 memory, cron tasks & autonomous skills.',
        cmd: 'iex (irm https://hermes-agent.nousresearch.com/install.ps1)',
      },
      {
        id: 'anomalyco/opencode',
        url: 'https://github.com/anomalyco/opencode',
        meta: 'TypeScript · Coding CLI',
        desc: 'Open-source terminal & desktop coding agent with build/plan modes.',
        cmd: 'npm install -g @opencode/cli@latest',
      },
    ],
  },
  'replace-paid': {
    title: 'Replace Paid SaaS & Docker',
    subtitle: 'Self-hosted automation, native container runtimes, and desktop alternatives.',
    envNote: 'Docker is not installed—commands below use native Node.js v24.20.0 or prebuilt Windows installers.',
    picks: [
      {
        id: 'n8n-io/n8n',
        url: 'https://github.com/n8n-io/n8n',
        meta: 'TypeScript · Workflows',
        desc: 'Replace Zapier/Make with 400+ integrations running natively on Node.js.',
        cmd: 'npx n8n',
      },
      {
        id: 'libracoder/kiri',
        url: 'https://github.com/libracoder/kiri',
        meta: 'Rust · Containers',
        desc: 'Lightweight Docker Desktop replacement speaking the Docker Engine API & Compose.',
        cmd: 'gh release download -R libracoder/kiri --pattern "*win*"',
      },
      {
        id: 'storytold/photocraft',
        url: 'https://github.com/storytold/photocraft',
        meta: 'Rust · PSD Editor',
        desc: 'Offline Rust image editor with layers, masks, CMYK/Lab & PSD support.',
        cmd: 'gh release download v0.23.1 -R storytold/photocraft --pattern "*win*"',
      },
    ],
  },
  'zero-install': {
    title: 'Zero-Install & Offline Apps',
    subtitle: 'Single-file WebGPU worlds, static AI chat UIs, and offline knowledge libraries.',
    envNote: 'Runs in Chrome/Edge or on Python 3.12.10 / Node.js v24.20.0 with minimal setup.',
    picks: [
      {
        id: 'Noniv/abyssal-garden',
        url: 'https://github.com/Noniv/abyssal-garden',
        meta: 'WebGPU · 97 KB HTML',
        desc: 'Single-file procedural WebGPU underwater world with zero external assets.',
        cmd: 'gh repo clone Noniv/abyssal-garden; python -m http.server 8080 -d abyssal-garden',
      },
      {
        id: 'deepseek-ai/chat-demo',
        url: 'https://github.com/deepseek-ai/chat-demo',
        meta: 'TypeScript · Static UI',
        desc: 'Zero-backend DeepSeek chat client with KaTeX, Mermaid & IndexedDB history.',
        cmd: 'corepack enable; gh repo clone deepseek-ai/chat-demo',
      },
      {
        id: 'huggingface/pybot',
        url: 'https://github.com/huggingface/pybot',
        meta: 'Python · Zero Deps',
        desc: '640k-line pure-Python rule-based chatbot with no weights or pip packages.',
        cmd: 'gh repo clone huggingface/pybot; python -m pybot',
      },
    ],
  },
  'media-hardware': {
    title: 'Video, Graphics & Hardware',
    subtitle: 'AI video clippers, variable UI fonts, 3D pipelines, and Windows peripheral tools.',
    envNote: 'Prebuilt Windows binaries via gh CLI; PeakCut requires winget install Gyan.FFmpeg.',
    picks: [
      {
        id: 'haziqahmedqasmi/PeakCut',
        url: 'https://github.com/haziqahmedqasmi/PeakCut',
        meta: 'Python · Video Clipper',
        desc: 'Self-hosted 9:16 livestream & video clipper (clone to C:\\peakcut for Windows path limits).',
        cmd: 'winget install Gyan.FFmpeg; gh repo clone haziqahmedqasmi/PeakCut C:\\peakcut',
      },
      {
        id: 'krisgfx9/Wireless-Device-Battery-Monitor',
        url: 'https://github.com/krisgfx9/Wireless-Device-Battery-Monitor',
        meta: 'C++/Win32 · BatteryHub',
        desc: '350 KB Windows taskbar battery widget for mice, headsets & controllers.',
        cmd: 'gh release download v1.1.0 -R krisgfx9/Wireless-Device-Battery-Monitor --pattern "BatteryHub-*"',
      },
      {
        id: 'joshpuckett/allo',
        url: 'https://github.com/joshpuckett/allo',
        meta: 'OFL-1.1 · Variable Font',
        desc: 'Open-source UI & display typeface with weight, roundness & optical-size axes.',
        cmd: 'npm install allo-font',
      },
    ],
  },
  gaming: {
    title: 'Gaming, Engines & Frame-Gen',
    subtitle: 'Open-source game engines, neural frame generation, shaders, and controller utilities.',
    envNote: 'Prebuilt Windows binaries via winget/gh (no C++ or Rust compiler needed to run).',
    picks: [
      {
        id: 'godotengine/godot',
        url: 'https://github.com/godotengine/godot',
        meta: 'C++ · 120k+ stars',
        desc: 'Multi-platform 2D & 3D open-source game engine with native Windows editor.',
        cmd: 'winget install GodotEngine.GodotEngine',
      },
      {
        id: 'apex-compute/ANR',
        url: 'https://github.com/apex-compute/ANR',
        meta: 'C++ · Neural Frame-Gen',
        desc: 'Apex Neural Rendering frame generation & lossless comparison recorder for Windows.',
        cmd: 'gh release download FG-V.B19 -R apex-compute/ANR --pattern "*windows*"',
      },
      {
        id: 'bevyengine/bevy',
        url: 'https://github.com/bevyengine/bevy',
        meta: 'Rust · 49k+ stars',
        desc: 'Data-driven ECS game engine in Rust (install Rustup via winget to compile games).',
        cmd: 'winget install Rustlang.Rustup; gh repo clone bevyengine/bevy',
      },
    ],
  },
  emulators: {
    title: 'Emulators & Console Tools',
    subtitle: 'PlayStation, retro, Flash, and browser-based x86 emulation plus console dump tools.',
    envNote: 'Download prebuilt Windows binaries directly with gh CLI (no C++/Rust build tools needed).',
    picks: [
      {
        id: 'shadps4-emu/shadPS4',
        url: 'https://github.com/shadps4-emu/shadPS4',
        meta: 'C++ · 34k+ stars',
        desc: 'Actively developed PlayStation 4 emulator for Windows, Linux, and macOS.',
        cmd: 'gh release download -R shadps4-emu/shadPS4 --pattern "*win64*"',
      },
      {
        id: 'RPCS3/rpcs3',
        url: 'https://github.com/RPCS3/rpcs3',
        meta: 'C++ · 20k+ stars',
        desc: 'Open-source PlayStation 3 emulator and debugger with Vulkan/DX12 backends.',
        cmd: 'gh release download -R RPCS3/rpcs3 --pattern "*win64*"',
      },
      {
        id: 'ruffle-rs/ruffle',
        url: 'https://github.com/ruffle-rs/ruffle',
        meta: 'Rust · 18k+ stars',
        desc: 'Memory-safe Flash Player emulator for desktop & WebAssembly.',
        cmd: 'gh release download -R ruffle-rs/ruffle --pattern "*windows*"',
      },
      {
        id: 'quer3q/kraken-mount',
        url: 'https://github.com/quer3q/kraken-mount',
        meta: 'Rust · PS5 Mounter',
        desc: 'Minimalist PS5 game mounter supporting PKG, folder dumps, zstd, and lz4.',
        cmd: 'gh release list -R quer3q/kraken-mount; gh repo clone quer3q/kraken-mount',
      },
    ],
  },
  vr: {
    title: 'VR, WebXR & Spatial 3D',
    subtitle: 'Wireless PC-to-headset VR streaming, WebXR frameworks, RE Engine VR mods & WebGPU 3D.',
    envNote: 'ALVR & REFramework ship prebuilt Windows binaries via gh; A-Frame & WebGPU run via Node.js/browser.',
    picks: [
      {
        id: 'alvr-org/ALVR',
        url: 'https://github.com/alvr-org/ALVR',
        meta: 'Rust · PC VR Streaming',
        desc: 'Stream SteamVR games from your Windows PC to standalone headsets over Wi-Fi.',
        cmd: 'gh release download -R alvr-org/ALVR --pattern "*windows*"',
      },
      {
        id: 'aframevr/aframe',
        url: 'https://github.com/aframevr/aframe',
        meta: 'JavaScript · WebXR',
        desc: 'Declarative HTML/ECS framework for building browser-based VR & AR experiences.',
        cmd: 'npm install aframe',
      },
      {
        id: 'praydog/REFramework',
        url: 'https://github.com/praydog/REFramework',
        meta: 'C++ · 6DOF VR Mods',
        desc: 'Mod loader, scripting platform & full VR support for RE Engine games on Windows.',
        cmd: 'gh release list -R praydog/REFramework; gh release download -R praydog/REFramework',
      },
    ],
  },
};

function matchesGoal(repo, goal) {
  if (goal === 'all') return true;
  const text = `${repo.id} ${repo.summary} ${repo.topic}`.toLowerCase();
  switch (goal) {
    case 'local-ai':
      return text.includes('agent') || text.includes('gateway') || text.includes('harness') || text.includes('llm') || text.includes('opencode');
    case 'replace-paid':
      return text.includes('self-hosted') || text.includes('docker') || text.includes('photoshop') || text.includes('converter') || text.includes('workflow');
    case 'zero-install':
      return text.includes('offline') || text.includes('static') || text.includes('single') || text.includes('webgpu') || text.includes('chat-demo');
    case 'media-hardware':
      return text.includes('video') || text.includes('battery') || text.includes('frame') || text.includes('typeface') || text.includes('clipper') || text.includes('raster');
    case 'gaming':
      return text.includes('game') || text.includes('frame') || text.includes('controller') || text.includes('xbox') || text.includes('playstation') || text.includes('shader') || text.includes('godot') || text.includes('bevy');
    case 'emulators':
      return text.includes('emulator') || text.includes('ps5') || text.includes('ps4') || text.includes('rpcs3') || text.includes('pkg') || text.includes('switch2') || text.includes('kraken-mount');
    case 'vr':
      return text.includes('vr') || text.includes('webxr') || text.includes('openxr') || text.includes('webgpu') || text.includes('3d') || text.includes('spatial') || text.includes('shader');
    default:
      return true;
  }
}

function renderGoalSpotlight(filteredRepos) {
  if (!el.goalSpotlight) return;
  const cfg = GOAL_CONFIG[state.goal];
  if (!cfg) {
    el.goalSpotlight.classList.add('hidden');
    el.goalSpotlight.innerHTML = '';
    return;
  }

  el.goalSpotlight.classList.remove('hidden');
  el.goalSpotlight.innerHTML = `
    <div class="goal-spotlight-head">
      <div>
        <h3>${escapeHtml(cfg.title)} <span class="topic-tag">${filteredRepos.length} in current feed</span></h3>
        <p>${escapeHtml(cfg.subtitle)} <strong>Windows fit:</strong> ${escapeHtml(cfg.envNote)}</p>
      </div>
      <div class="goal-spotlight-actions">
        <button type="button" class="btn-primary btn-sm" id="loadGoalStarterBtn">Load Starter .ps1</button>
        <button type="button" class="copy-mini-btn" id="jumpToGoalFeedBtn">Jump to Feed ↓</button>
      </div>
    </div>
    <div class="goal-picks-grid">
      ${cfg.picks
        .map(
          (p) => `
          <div class="goal-pick-card">
            <div class="goal-pick-top">
              <a class="goal-pick-name" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.id)}</a>
              <span class="topic-tag">${escapeHtml(p.meta)}</span>
            </div>
            <p class="goal-pick-desc">${escapeHtml(p.desc)}</p>
            <div class="goal-pick-cmd">
              <code title="${escapeHtml(p.cmd)}">$ ${escapeHtml(p.cmd)}</code>
              <button type="button" class="copy-mini-btn" data-goal-copy="${escapeHtml(p.cmd)}">Copy</button>
            </div>
          </div>
        `
        )
        .join('')}
    </div>
  `;

  el.goalSpotlight.querySelectorAll('[data-goal-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.dataset.goalCopy));
  });

  document.getElementById('jumpToGoalFeedBtn')?.addEventListener('click', () => {
    document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('loadGoalStarterBtn')?.addEventListener('click', () => {
    const lines = [
      `# StackPulse Starter Script — ${cfg.title}`,
      '$ErrorActionPreference = "Stop"',
      'Set-Location "g:\\My Drive\\Antigravity\\Projects\\Popular Github Projects"',
      '',
      ...cfg.picks.flatMap((p) => [`# ${p.id} (${p.meta})`, p.cmd, '']),
    ];
    const script = lines.join('\n').trim();
    el.stackScriptPreview.querySelector('code').textContent = script;
    copyText(script);
    showToast(`Loaded ${cfg.title} starter into .ps1 preview & clipboard`);
  });
}

function getFilteredRepos(windowRepos) {
  const q = state.search.trim().toLowerCase();

  const filtered = windowRepos.filter((repo) => {
    if (!matchesGoal(repo, state.goal)) return false;
    if (state.category === 'saved') {
      if (!state.saved.has(repo.id)) return false;
    } else if (state.category !== 'all' && repo.category !== state.category) {
      return false;
    }

    if (state.topic !== 'all' && repo.topic !== state.topic) return false;
    if (state.language !== 'all' && normalizeLang(repo.language) !== state.language) return false;

    if (q) {
      const cmdText = repo.apply.commands.map((c) => c.code).join(' ');
      const haystack = `${repo.id} ${repo.language} ${repo.topic} ${repo.summary} ${cmdText} ${repo.license}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (state.sort) {
      case 'stars-asc':
        return a.stars - b.stars;
      case 'date-desc': {
        const d = (b.reportDate || '').localeCompare(a.reportDate || '');
        return d !== 0 ? d : b.stars - a.stars;
      }
      case 'date-asc': {
        const d = (a.reportDate || '').localeCompare(b.reportDate || '');
        return d !== 0 ? d : b.stars - a.stars;
      }
      case 'upvotes': {
        const diff = (state.upvotes.has(b.id) ? 1 : 0) - (state.upvotes.has(a.id) ? 1 : 0);
        return diff !== 0 ? diff : b.stars - a.stars;
      }
      case 'ready': {
        const order = { ready: 0, prebuilt: 1, 'extra-tool': 2 };
        const diff = order[a.compatibility.status] - order[b.compatibility.status];
        return diff !== 0 ? diff : b.stars - a.stars;
      }
      case 'stars-desc':
      default:
        return b.stars - a.stars;
    }
  });

  return filtered;
}

function buildStackScript(allRepos) {
  const savedRepos = [...state.saved]
    .map((id) => allRepos.find((r) => r.id === id))
    .filter(Boolean);

  if (savedRepos.length === 0) {
    return '# Save repositories below to generate a combined Windows PowerShell setup script';
  }

  const lines = [
    '# Fresh New TeCH — Custom Stack Installer',
    '$ErrorActionPreference = "Stop"',
    '',
  ];
  for (const r of savedRepos) {
    const cmd = getPrimaryCommand(r) || `gh repo clone ${r.id}`;
    lines.push(`# ${r.id} (${r.language})`, cmd, '');
  }
  return lines.join('\n').trim();
}

function renderStackBuilder(allRepos) {
  const savedRepos = [...state.saved]
    .map((id) => allRepos.find((r) => r.id === id))
    .filter(Boolean);

  el.stackBuilderCount.textContent = String(savedRepos.length);
  el.stackScriptPreview.querySelector('code').textContent = buildStackScript(allRepos);

  if (savedRepos.length === 0) {
    el.stackChipsWrap.innerHTML =
      '<span class="stack-empty-hint">Click "Save" on any repository below to add it to your install script.</span>';
    return;
  }

  el.stackChipsWrap.innerHTML = savedRepos
    .map(
      (r) =>
        `<button type="button" class="stack-chip-remove" data-remove-stack="${escapeHtml(r.id)}" title="Remove from stack">${escapeHtml(r.name)} ×</button>`
    )
    .join('');

  el.stackChipsWrap.querySelectorAll('[data-remove-stack]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.saved.delete(btn.dataset.removeStack);
      saveSet(STORAGE_KEYS.saved, state.saved);
      render();
    });
  });
}

function selectRepo(id, openDrawer = true) {
  state.selectedId = id;
  if (id && !state.reviewed.has(id)) {
    state.reviewed.add(id);
    saveSet(STORAGE_KEYS.reviewed, state.reviewed);
  }
  if (openDrawer && window.innerWidth <= 1080) {
    el.rightInspector.classList.add('mobile-open');
  }
  render();
}

function renderCounts(windowRepos) {
  for (const key of Object.keys(WINDOW_CONFIG)) {
    const { repos } = getWindowData(key);
    const badge = document.getElementById(`badge-${key}`);
    if (badge) badge.textContent = String(repos.length);
  }

  document.getElementById('cat-all').textContent = String(windowRepos.length);
  document.getElementById('cat-popular').textContent = String(
    windowRepos.filter((r) => r.category === 'popular').length
  );
  document.getElementById('cat-rising').textContent = String(
    windowRepos.filter((r) => r.category === 'rising').length
  );
  document.getElementById('cat-saved').textContent = String(
    windowRepos.filter((r) => state.saved.has(r.id)).length
  );
}

function renderFilters(windowRepos) {
  const langCounts = new Map();
  const topicCounts = new Map();
  for (const r of windowRepos) {
    const lang = normalizeLang(r.language);
    langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
    topicCounts.set(r.topic, (topicCounts.get(r.topic) || 0) + 1);
  }

  const sortedLangs = [...langCounts.entries()].sort((a, b) => b[1] - a[1]);
  const total = windowRepos.length || 1;

  el.languageBar.innerHTML = sortedLangs
    .map(([lang, count]) => {
      const pct = ((count / total) * 100).toFixed(2);
      return `<div class="lang-segment" style="width:${pct}%;background:${getLangColor(lang)}" title="${escapeHtml(lang)}: ${count}"></div>`;
    })
    .join('');

  el.langSelect.innerHTML = [
    `<option value="all">All Languages (${windowRepos.length})</option>`,
    ...sortedLangs.map(
      ([lang, count]) =>
        `<option value="${escapeHtml(lang)}">${escapeHtml(lang)} (${count})</option>`
    ),
  ].join('');
  el.langSelect.value = sortedLangs.some(([l]) => l === state.language) ? state.language : 'all';

  const sortedTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]);
  el.topicSelect.innerHTML = [
    `<option value="all">All Topics (${windowRepos.length})</option>`,
    ...sortedTopics.map(
      ([topic, count]) =>
        `<option value="${escapeHtml(topic)}">${escapeHtml(topic)} (${count})</option>`
    ),
  ].join('');
  el.topicSelect.value = sortedTopics.some(([t]) => t === state.topic) ? state.topic : 'all';
}

function renderPagination(totalItems, totalPages, startIdx, endIdx) {
  if (!el.paginationBar) return;
  if (totalItems === 0) {
    el.paginationBar.innerHTML = '';
    return;
  }

  const pageButtons = [];
  for (let p = 1; p <= totalPages; p++) {
    pageButtons.push(
      `<button type="button" class="page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`
    );
  }

  el.paginationBar.innerHTML = `
    <span class="pagination-info">Showing ${startIdx + 1}–${endIdx} of ${totalItems} tools</span>
    <div class="pagination-controls">
      <button type="button" class="page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
      ${pageButtons.join('')}
      <button type="button" class="page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;

  el.paginationBar.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextPage = Number(btn.dataset.page);
      if (nextPage < 1 || nextPage > totalPages || nextPage === state.page) return;
      state.page = nextPage;
      render();
      const feedTop = (document.querySelector('.workspace-main')?.offsetTop || 0) - 136;
      window.scrollTo({ top: Math.max(0, feedTop), behavior: 'smooth' });
    });
  });
}

function renderLedger(filteredRepos) {
  if (filteredRepos.length === 0) {
    el.repoGrid.innerHTML = `
      <div class="empty-state">
        <p>No repositories match your current filters in this time horizon.</p>
      </div>
    `;
    renderPagination(0, 1, 0, 0);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const startIdx = (state.page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filteredRepos.length);
  const pageRepos = filteredRepos.slice(startIdx, endIdx);

  el.repoGrid.innerHTML = pageRepos
    .map((repo, idx) => {
      const displayRank = startIdx + idx + 1;
      const isSelected = repo.id === state.selectedId;
      const isUpvoted = state.upvotes.has(repo.id);
      const isSaved = state.saved.has(repo.id);
      const langColor = getLangColor(repo.language);
      const catClass = repo.category === 'popular' ? 'pill-popular' : 'pill-rising';
      const catLabel = repo.category === 'popular' ? 'Popular' : 'Rising';
      const cmd = getPrimaryCommand(repo);

      return `
        <article class="ledger-row ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(repo.id)}">
          <div class="row-header">
            <div class="row-title-wrap">
              <span class="row-rank">#${displayRank}</span>
              <img class="repo-avatar" src="${escapeHtml(getAvatarUrl(repo.owner))}" alt="${escapeHtml(repo.owner)} avatar" loading="lazy" />
              <span class="row-repo-name">${escapeHtml(repo.id)}</span>
            </div>
            <div class="row-badges">
              <span class="topic-tag">${escapeHtml(repo.topic)}</span>
              <span class="pill ${catClass}">${catLabel}</span>
            </div>
          </div>

          <p class="row-summary">${escapeHtml(repo.summary)}</p>

          ${
            cmd
              ? `<div class="row-cmd-inline">
                  <code class="row-cmd-text">$ ${escapeHtml(cmd)}</code>
                  <button type="button" class="copy-mini-btn" data-copy="${escapeHtml(cmd)}">Copy</button>
                </div>`
              : ''
          }

          <div class="row-meta" style="justify-content:space-between;">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:14px;">
              <span class="meta-item">
                <span class="lang-dot" style="background:${langColor}"></span>
                ${escapeHtml(repo.language)}
              </span>
              <span class="meta-item">${formatNumber(repo.stars)} stars</span>
              <span class="meta-item">${formatNumber(repo.forks)} forks</span>
              <span class="meta-item">${escapeHtml(repo.license)}</span>
              <span class="meta-item">${escapeHtml(repo.reportDate || '')}</span>
            </div>
            <div class="row-actions-group">
              <button type="button" class="action-chip-btn ${isSelected ? 'active' : ''}" data-open-playbook="${escapeHtml(repo.id)}">
                ${isSelected ? 'Viewing' : 'View Playbook'}
              </button>
              <button type="button" class="action-chip-btn ${isUpvoted ? 'active' : ''}" data-upvote="${escapeHtml(repo.id)}">
                ${isUpvoted ? 'Upvoted' : 'Upvote'}
              </button>
              <button type="button" class="action-chip-btn saved ${isSaved ? 'active' : ''}" data-save="${escapeHtml(repo.id)}">
                ${isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  el.repoGrid.querySelectorAll('.ledger-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        e.stopPropagation();
        copyText(copyBtn.dataset.copy);
        return;
      }

      const upvoteBtn = e.target.closest('[data-upvote]');
      if (upvoteBtn) {
        e.stopPropagation();
        const id = upvoteBtn.dataset.upvote;
        if (state.upvotes.has(id)) state.upvotes.delete(id);
        else state.upvotes.add(id);
        saveSet(STORAGE_KEYS.upvotes, state.upvotes);
        render();
        return;
      }

      const saveBtn = e.target.closest('[data-save]');
      if (saveBtn) {
        e.stopPropagation();
        const id = saveBtn.dataset.save;
        if (state.saved.has(id)) {
          state.saved.delete(id);
          showToast('Removed from Saved Stack');
        } else {
          state.saved.add(id);
          showToast('Saved to your Stack');
        }
        saveSet(STORAGE_KEYS.saved, state.saved);
        render();
        return;
      }

      selectRepo(row.dataset.id);
    });
  });
}

function renderBrief(allWindowRepos) {
  const repo = allWindowRepos.find((r) => r.id === state.selectedId);
  if (!repo) {
    el.inspectorBody.innerHTML = `
      <div class="brief-empty">
        <p>Select any repository to inspect its traction, license, and one-click setup commands.</p>
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
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <img class="repo-avatar" src="${escapeHtml(getAvatarUrl(repo.owner))}" alt="${escapeHtml(repo.owner)} avatar" />
        <div>
          <h2 style="margin:0;">${escapeHtml(repo.id)}</h2>
          <a class="brief-link" href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">
            <span>Open on GitHub</span>
          </a>
        </div>
      </div>
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
      <h3>What It Does</h3>
      <p class="brief-summary-text">${escapeHtml(repo.summary)}</p>
    </div>

    <div class="brief-section">
      <h3>Environment Fit</h3>
      <div class="toolchain-list">${toolsHtml}</div>
    </div>

    <div class="brief-section">
      <h3>Quick-Start Commands</h3>
      ${notesHtml}
      ${commandsHtml}
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

function openDigestModal() {
  if (!state.data) return;
  const cfg = WINDOW_CONFIG[state.window];
  const { repos } = getWindowData(state.window);
  const topFive = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 5);

  el.digestSubtitle.textContent = `${cfg.label} · Top 5 high-signal repositories you can test in minutes.`;
  el.digestModalBody.innerHTML = `
    <div class="digest-list">
      ${topFive
        .map((r, i) => {
          const cmd = getPrimaryCommand(r);
          return `
            <div class="digest-item">
              <div class="digest-item-head">
                <strong>${i + 1}. ${escapeHtml(r.id)}</strong>
                <span class="topic-tag">${formatNumber(r.stars)} stars · ${escapeHtml(r.language)}</span>
              </div>
              <p>${escapeHtml(r.summary)}</p>
              ${
                cmd
                  ? `<div class="row-cmd-inline">
                      <code class="row-cmd-text">$ ${escapeHtml(cmd)}</code>
                      <button type="button" class="copy-mini-btn" data-copy="${escapeHtml(cmd)}">Copy</button>
                    </div>`
                  : ''
              }
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  el.digestModalBody.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.dataset.copy));
  });
  el.digestModal.classList.remove('hidden');
}

function exportExecutiveBrief() {
  if (!state.data) return;
  const cfg = WINDOW_CONFIG[state.window];
  const { repos } = getWindowData(state.window);
  const filtered = getFilteredRepos(repos);

  const lines = [
    `# Fresh New TeCH — Daily Open-Source Brief (${cfg.label})`,
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
  a.download = `fresh-new-tech-brief-${state.window}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported Brief (.md)');
}

function renderAltFinder() {
  if (!state.data?.reports?.length) return;
  const allKnown = [];
  for (const rep of state.data.reports) {
    allKnown.push(...rep.popular, ...rep.rising);
  }
  const targetId = el.altSelect.value;
  const match = allKnown.find((r) => r.id.toLowerCase() === targetId.toLowerCase()) || allKnown[0];
  if (!match) return;

  const cmd = getPrimaryCommand(match) || `gh repo clone ${match.id}`;
  el.altResultBox.innerHTML = `
    <div class="alt-result-head">
      <strong>${escapeHtml(match.id)}</strong>
      <span class="topic-tag">${formatNumber(match.stars)} stars · ${escapeHtml(match.language)}</span>
    </div>
    <p class="alt-result-desc">${escapeHtml(match.summary)}</p>
    <div class="row-cmd-inline">
      <code class="row-cmd-text">$ ${escapeHtml(cmd)}</code>
      <button type="button" class="copy-mini-btn" data-copy="${escapeHtml(cmd)}">Copy</button>
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button type="button" class="action-chip-btn" data-open-alt="${escapeHtml(match.id)}">View Playbook</button>
    </div>
  `;

  el.altResultBox.querySelector('[data-copy]')?.addEventListener('click', (e) => {
    copyText(e.currentTarget.dataset.copy);
  });
  el.altResultBox.querySelector('[data-open-alt]')?.addEventListener('click', (e) => {
    selectRepo(e.currentTarget.dataset.openAlt);
    if (window.innerWidth > 1080) {
      document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

function render() {
  if (!state.data) return;

  const cfg = WINDOW_CONFIG[state.window];
  const { repos, reportsInWindow, startDate, endDate } = getWindowData(state.window);
  const filtered = getFilteredRepos(repos);

  if (!filtered.some((r) => r.id === state.selectedId)) {
    state.selectedId = filtered.length > 0 ? filtered[0].id : null;
  }

  const rangeText = startDate === endDate ? endDate : `${startDate} to ${endDate}`;
  el.windowMeta.textContent = `${cfg.label} · ${rangeText || '—'}`;
  el.headerStatusText.textContent = `Fresh Edition · ${state.data.latestDate || '—'} · ${state.data.reportCount} Daily Briefings`;

  const totalStars = filtered.reduce((acc, r) => acc + r.stars, 0);
  el.altEcosystemMeta.textContent = `${filtered.length} tools · ${formatCompact(totalStars)} stars`;
  el.kpiReviewed.textContent = `${state.reviewed.size} reviewed`;

  renderAltFinder();
  renderGoalSpotlight(filtered);
  renderStackBuilder(repos);
  renderCounts(repos);
  renderFilters(repos);
  renderLedger(filtered);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIdx = (state.page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, filtered.length);
  renderPagination(filtered.length, totalPages, startIdx, endIdx);
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
  const hashGoalMatch = location.hash.match(/^#goal=([a-z0-9-]+)$/i);
  if (hashGoalMatch && GOAL_CONFIG[hashGoalMatch[1]] && state.goal === 'all') {
    applyGoalSelection(hashGoalMatch[1], false);
  } else {
    render();
  }
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

function applyGoalSelection(goal, shouldScroll = true) {
  state.goal = goal;
  state.page = 1;

  if (goal !== 'all' && state.data) {
    const currentMatches = getFilteredRepos(getWindowData(state.window).repos);
    if (currentMatches.length === 0) {
      for (const fallbackWin of ['1w', '1m']) {
        const candidateMatches = getWindowData(fallbackWin).repos.filter((r) => matchesGoal(r, goal));
        if (candidateMatches.length > 0) {
          state.window = fallbackWin;
          document.querySelectorAll('[data-window]').forEach((b) => {
            const active = b.dataset.window === fallbackWin;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          break;
        }
      }
    }
  }

  document.querySelectorAll('[data-goal]').forEach((b) =>
    b.classList.toggle('active', b.dataset.goal === state.goal)
  );
  el.resetGoalBtn.classList.toggle('hidden', state.goal === 'all');

  if (state.goal === 'all') {
    if (location.hash.startsWith('#goal=')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  } else {
    history.replaceState(null, '', `#goal=${encodeURIComponent(state.goal)}`);
  }

  render();

  if (shouldScroll && state.goal !== 'all') {
    el.goalSpotlight?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function bindEvents() {
  document.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetGoal = btn.dataset.goal;
      const nextGoal = state.goal === targetGoal ? 'all' : targetGoal;
      applyGoalSelection(nextGoal, true);
    });
  });

  el.resetGoalBtn?.addEventListener('click', () => {
    applyGoalSelection('all', false);
  });

  el.copyStackScriptBtn?.addEventListener('click', () => {
    const { repos } = getWindowData(state.window);
    copyText(buildStackScript(repos));
  });

  el.downloadStackScriptBtn?.addEventListener('click', () => {
    const { repos } = getWindowData(state.window);
    const script = buildStackScript(repos);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install-my-stack.ps1';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded install-my-stack.ps1');
  });

  document.querySelectorAll('[data-window]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-window]').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      state.window = btn.dataset.window;
      state.page = 1;
      state.language = 'all';
      state.topic = 'all';
      render();
    });
  });

  document.querySelectorAll('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-category]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.category;
      state.page = 1;
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

  el.altSelect?.addEventListener('change', renderAltFinder);

  el.topicSelect.addEventListener('change', () => {
    state.topic = el.topicSelect.value;
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
      el.digestModal.classList.add('hidden');
    }
  });

  el.digestBtn.addEventListener('click', openDigestModal);
  el.closeDigestBtn.addEventListener('click', () => el.digestModal.classList.add('hidden'));
  el.digestModal.addEventListener('click', (e) => {
    if (e.target === el.digestModal) el.digestModal.classList.add('hidden');
  });

  el.closeMobileBriefBtn?.addEventListener('click', () => {
    el.rightInspector.classList.remove('mobile-open');
  });

  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    el.installAppBtn?.classList.remove('hidden');
  });

  el.installAppBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      el.installAppBtn.classList.add('hidden');
      showToast('Fresh New TeCH installed');
    }
    deferredInstallPrompt = null;
  });

  el.exportBriefBtn.addEventListener('click', exportExecutiveBrief);
  document.getElementById('footerExportBtn')?.addEventListener('click', exportExecutiveBrief);
  document.getElementById('footerDigestBtn')?.addEventListener('click', openDigestModal);

  document.querySelectorAll('[data-footer-window]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetWin = btn.dataset.footerWindow;
      state.window = targetWin;
      state.page = 1;
      state.language = 'all';
      state.topic = 'all';
      document.querySelectorAll('[data-window]').forEach((b) => {
        const active = b.dataset.window === targetWin;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      render();
      document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

bindEvents();
connectLiveUpdates();
fetchReports().catch((err) => {
  el.repoGrid.innerHTML = `<div class="empty-state">Failed to load reports: ${escapeHtml(err.message)}</div>`;
});
