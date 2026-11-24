import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function getApplyInstructions(repo) {
  const fullName = repo.fullName;
  const dirName = fullName.split('/')[1] || 'repo';
  const lang = (repo.language || '').toLowerCase();
  const desc = (repo.description || '').toLowerCase();

  if (lang.includes('typescript') || lang.includes('javascript')) {
    return [
      `- Runs natively on your installed **Node.js \`v24.20.0\`** and **\`npm\`**:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh repo clone ${fullName}`,
      `  Set-Location "${dirName}"`,
      `  npm install`,
      '  ```',
    ].join('\n');
  }

  if (lang.includes('python')) {
    return [
      `- Create an isolated environment with your installed **\`uv 0.12.5\`** and **Python \`3.12.10\`**:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh repo clone ${fullName}`,
      `  Set-Location "${dirName}"`,
      `  uv venv --python 3.12`,
      `  uv pip install -e .`,
      '  ```',
    ].join('\n');
  }

  if (lang.includes('rust')) {
    return [
      `- **Prebuilt Release Path:** \`cargo\` / \`rustc\` are **not installed** on this machine; check for Windows release binaries via \`gh\` first:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh release list -R ${fullName}`,
      `  gh release download -R ${fullName} --pattern "*windows*"`,
      '  ```',
      `- To compile from source, install the Rust toolchain: \`winget install Rustlang.Rustup\`.`,
    ].join('\n');
  }

  if (lang.includes('go')) {
    return [
      `- **Prebuilt Release Path:** \`go\` is **not installed** on this machine; download prebuilt Windows binaries via \`gh\`:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh release list -R ${fullName}`,
      `  gh release download -R ${fullName} --pattern "*windows*"`,
      '  ```',
      `- To build from source, install Go: \`winget install GoLang.Go\`.`,
    ].join('\n');
  }

  if (lang.includes('c++') || lang.includes('c#') || lang === 'c') {
    return [
      `- **Prebuilt Windows Release:** C/C++ compilers are **not installed** on this machine; inspect and download releases via \`gh\`:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh release list -R ${fullName}`,
      `  gh release download -R ${fullName}`,
      '  ```',
    ].join('\n');
  }

  if (desc.includes('docker')) {
    return [
      `- **Note:** \`docker\` is **not installed** on this machine; clone with \`gh\` to inspect native or Kiri-compatible setup:`,
      '  ```powershell',
      `  Set-Location "."`,
      `  gh repo clone ${fullName}`,
      '  ```',
    ].join('\n');
  }

  return [
    `- Clone and inspect locally with your installed **GitHub CLI (\`gh 2.97.0\`)**:`,
    '  ```powershell',
    `  Set-Location "."`,
    `  gh repo clone ${fullName}`,
    '  ```',
  ].join('\n');
}

async function ghSearch(queryArgs) {
  const args = [
    'search',
    'repos',
    ...queryArgs,
    '--sort',
    'stars',
    '--order',
    'desc',
    '--limit',
    '10',
    '--json',
    'fullName,url,stargazersCount,forksCount,openIssuesCount,language,license,createdAt,pushedAt,description',
  ];
  const { stdout } = await execFileAsync('gh', args, { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout || '[]');
}

function getProjectApplicability(repo) {
  const text = `${repo.fullName} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
  if (text.includes('agent') || text.includes('mcp') || text.includes('skill') || text.includes('llm')) {
    return 'Applies to current agent/MCP/automation workflows (`baselines`, `MCP`, `ollama`) and new AI-assisted apps.';
  }
  if (text.includes('video') || text.includes('clip') || text.includes('photo') || text.includes('ui') || text.includes('font')) {
    return 'Applies to current media/UI projects (`portfolio`, `youtube shorts edit for gaming`, `Popular Github Projects`) and new web/media builds.';
  }
  if (text.includes('docker') || text.includes('container') || text.includes('security') || text.includes('reverse')) {
    return 'Applies to infrastructure/security projects (`deploy`, `MY Security`, `reverse engineer applications`) and new service stacks.';
  }
  return 'Applies to general workspace utilities (`Popular Github Projects`, `deal Finder`) and new cross-platform projects.';
}

function renderRepoBlock(repo, idx) {
  const lang = repo.language || 'Unknown';
  const license = repo.license?.key?.toUpperCase() || repo.license?.name || 'Unspecified';
  const created = (repo.createdAt || '').slice(0, 10);
  const pushed = repo.pushedAt || '';
  const summary = (repo.description || 'Active open-source repository on GitHub.').replace(/\s+/g, ' ').trim();

  return [
    `### ${idx + 1}. \`${repo.fullName}\``,
    `- **URL:** ${repo.url}  `,
    `- **Stats:** \`${formatNum(repo.stargazersCount)}\` stars · \`${formatNum(repo.forksCount)}\` forks · \`${formatNum(repo.openIssuesCount)}\` open issues · Language: \`${lang}\` · License: \`${license}\`  `,
    `- **Activity:** Created \`${created}\` · Pushed \`${pushed}\`  `,
    `- **Summary:** ${summary}`,
    `- **Project Fit:** ${getProjectApplicability(repo)}`,
    '',
    '#### How to Apply in Your Environment',
    getApplyInstructions(repo),
    '',
    '---',
    '',
  ].join('\n');
}

function buildReportMarkdown(date, popular, rising) {
  const prevWeekDt = new Date(`${date}T00:00:00Z`);
  prevWeekDt.setUTCDate(prevWeekDt.getUTCDate() - 6);
  const risingStart = prevWeekDt.toISOString().slice(0, 10);

  return `# GitHub Daily Trending & Rising Projects Report — ${date}

**Report Date:** \`${date}\`  
**Data Source:** Live GitHub repository metadata via \`gh search repos\`  
**Scope:**
1. **Popular & Trending Repositories** — High-star projects with active pushes on \`${date}\`.
2. **New Rising Repositories** — Repositories created on \`${date}\` (or within \`${risingStart}\`–\`${date}\`) ranked by star traction.

---

## Local Windows Environment Baseline

All **How to Apply in Your Environment** instructions below are tailored to the verified toolchain on this machine:

| Tool | Status | Observed Version / Notes |
| :--- | :--- | :--- |
| **Git** | Installed | \`git version 2.53.0.windows.3\` |
| **GitHub CLI (\`gh\`)** | Installed | \`gh version 2.97.0\` (authenticated as \`Chammin00\`) |
| **Node.js / npm** | Installed | \`v24.20.0\` (\`npm\` available) |
| **Python** | Installed | \`Python 3.12.10\` |
| **uv** | Installed | \`uv 0.12.5\` |
| **winget** | Installed | \`v1.29.380\` |
| **Docker** | **Not installed** | Required for container-first workflows unless using a native runtime or Kiri |
| **pnpm / bun** | **Not installed** | Can be enabled via \`corepack enable\` or \`npm install -g pnpm\` |
| **Rust (\`cargo\`/\`rustc\`)** | **Not installed** | Required only when building Rust projects from source (\`winget install Rustlang.Rustup\`) |
| **Go (\`go\`)** | **Not installed** | Required only when building Go projects from source (\`winget install GoLang.Go\`) |
| **CMake / C++ build tools** | **Not installed** | Required only when compiling C++ apps from source |

---

## Part 1: Popular & Trending Repositories (High Recent Activity & Stars)

${popular.map((r, i) => renderRepoBlock(r, i)).join('\n')}
## Part 2: New Rising Repositories (Created ${date})

${rising.map((r, i) => renderRepoBlock(r, i)).join('\n')}`;
}

async function generateForDate(date, overwrite = false) {
  const outPath = path.join(REPORTS_DIR, `${date}.md`);
  if (!overwrite) {
    try {
      await fs.access(outPath);
      console.log(`Skipping existing ${date}.md`);
      return false;
    } catch {
      // proceed
    }
  }

  console.log(`Fetching GitHub trending & rising repos for ${date}...`);
  const popular = await ghSearch([`pushed:${date}..${date}`, 'stars:>5000']);
  let rising = await ghSearch([`created:${date}..${date}`, 'stars:>5']);

  if (rising.length < 5) {
    const startDt = new Date(`${date}T00:00:00Z`);
    startDt.setUTCDate(startDt.getUTCDate() - 3);
    const windowStart = startDt.toISOString().slice(0, 10);
    rising = await ghSearch([`created:${windowStart}..${date}`, 'stars:>10']);
  }

  const md = buildReportMarkdown(date, popular, rising);
  await fs.mkdir(REPORTS_DIR, { recursive: true });
  await fs.writeFile(outPath, md, 'utf8');
  console.log(`Saved ${outPath} (${popular.length} popular, ${rising.length} rising)`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const backfillIdx = args.indexOf('--backfill');
  const overwrite = args.includes('--overwrite');
  const today = new Date().toISOString().slice(0, 10);

  if (backfillIdx !== -1) {
    const days = Number.parseInt(args[backfillIdx + 1] || '7', 10);
    for (let i = 0; i < days; i++) {
      const dt = new Date(`${today}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() - i);
      const dateStr = dt.toISOString().slice(0, 10);
      await generateForDate(dateStr, overwrite);
    }
  } else {
    await generateForDate(today, overwrite);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
