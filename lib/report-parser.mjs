import fs from 'node:fs/promises';
import path from 'node:path';

export function parseIntSafe(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9]/g, '');
  return cleaned ? Number.parseInt(cleaned, 10) : 0;
}

export function sanitizePublicText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\s*\(authenticated as\s+`?[A-Za-z0-9_-]+`?\)/gi, '')
    .replace(/[a-zA-Z]:\\My Drive\\Antigravity\\Projects\\Popular Github Projects/g, '.')
    .replace(/[a-zA-Z]:\\My Drive\\Antigravity\\Projects\\\.\.\./g, 'deep cloud-synced folders')
    .replace(/[a-zA-Z]:\\My Drive\\[^\s`"')\]]*/g, '.');
}

export function sanitizeCommandCode(code) {
  if (!code) return '';
  const lines = String(code)
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*Set-Location\s+(?:-Path\s+)?["']?[a-zA-Z]:\\My Drive\\Antigravity\\Projects\\Popular Github Projects[^"'\r\n]*["']?\s*$/i.test(
          line.trim()
        )
    )
    .map((line) => sanitizePublicText(line));
  return lines.join('\n').trim();
}

export function parseBaselineTable(markdown) {
  const baselineMatch = markdown.match(
    /##\s+Local Windows Environment Baseline[\s\S]*?(?=\n---|\n##\s+)/i
  );
  if (!baselineMatch) return [];

  const lines = baselineMatch[0].split(/\r?\n/);
  const tools = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes(':---')) continue;
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim().replace(/\*\*/g, '').replace(/`/g, ''));
    if (cells.length >= 3 && cells[0].toLowerCase() !== 'tool') {
      const installed = !cells[1].toLowerCase().includes('not installed');
      tools.push({
        tool: cells[0],
        status: cells[1],
        installed,
        notes: sanitizePublicText(cells[2]),
      });
    }
  }
  return tools;
}

export function parseApplySection(applyText) {
  const codeBlocks = [];
  const codeRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeRegex.exec(applyText)) !== null) {
    const cleanedCode = sanitizeCommandCode(match[2].trim());
    if (cleanedCode) {
      codeBlocks.push({
        lang: match[1] || 'powershell',
        code: cleanedCode,
      });
    }
  }

  const withoutCode = applyText.replace(codeRegex, '').trim();
  const notes = withoutCode
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') || l.startsWith('* '))
    .map((l) => sanitizePublicText(l.replace(/^[-*]\s+/, '').trim()));

  return {
    raw: sanitizeCommandCode(applyText.trim()),
    notes,
    commands: codeBlocks,
  };
}

export function classifyCompatibility(applyText, summary, language) {
  const combined = `${applyText} ${summary}`.toLowerCase();
  const usesTools = [];

  if (combined.includes('node') || combined.includes('npm') || combined.includes('npx')) {
    usesTools.push('Node.js / npm');
  }
  if (combined.includes('python') || combined.includes('pip')) {
    usesTools.push('Python 3.12');
  }
  if (combined.includes('uv ') || combined.includes('`uv`')) {
    usesTools.push('uv');
  }
  if (combined.includes('gh ')) {
    usesTools.push('gh CLI');
  }
  if (combined.includes('winget ')) {
    usesTools.push('winget');
  }
  if (combined.includes('git ') || combined.includes('git clone')) {
    usesTools.push('git');
  }

  const missingDeps = [];
  if (
    combined.includes('docker is not installed') ||
    combined.includes('docker is absent') ||
    combined.includes('requires docker') ||
    combined.includes('defaults to docker')
  ) {
    missingDeps.push('Docker (optional/workaround)');
  }
  if (combined.includes('ffmpeg') || combined.includes('gyan.ffmpeg')) {
    missingDeps.push('FFmpeg (winget)');
  }
  if (combined.includes('rustlang.rustup') || combined.includes('cargo` / `rustc` are **not installed**')) {
    missingDeps.push('Rustup (optional/source)');
  }
  if (combined.includes('corepack enable') || combined.includes('pnpm')) {
    missingDeps.push('pnpm (corepack)');
  }
  if (combined.includes('golang.go') || combined.includes('`go` is not installed')) {
    missingDeps.push('Go (source only)');
  }

  let status = 'ready';
  let statusLabel = 'Ready on Baseline';

  if (
    combined.includes('gh release download') ||
    combined.includes('prebuilt windows') ||
    combined.includes('installer') ||
    combined.includes('portable')
  ) {
    if (!combined.includes('npm install') && !combined.includes('npx ') && !combined.includes('python ')) {
      status = 'prebuilt';
      statusLabel = 'Prebuilt / Installer';
    }
  }

  if (
    combined.includes('requires `winget install') ||
    combined.includes('requires winget install') ||
    combined.includes('corepack enable') ||
    (missingDeps.length > 0 && status === 'ready' && combined.includes('must be'))
  ) {
    status = 'extra-tool';
    statusLabel = 'Needs Extra Tool';
  }

  if (usesTools.length === 0 && language) {
    usesTools.push(language);
  }

  return {
    status,
    statusLabel,
    usesTools: [...new Set(usesTools)],
    missingDeps: [...new Set(missingDeps)],
  };
}

export function parseRepoSection(sectionText, category, reportDate) {
  const repos = [];
  const headingRegex = /^###\s+(\d+)\.\s+`?([^`\r\n]+)`?\s*$/gm;
  const matches = [...sectionText.matchAll(headingRegex)];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : sectionText.length;
    const block = sectionText.slice(start, end);

    const rank = Number.parseInt(matches[i][1], 10);
    const fullName = matches[i][2].trim();
    const [owner = '', name = fullName] = fullName.split('/');

    const urlMatch = block.match(/\*\*URL:\*\*\s*(https?:\/\/\S+)/i);
    const url = urlMatch ? urlMatch[1].trim() : `https://github.com/${fullName}`;

    const statsMatch = block.match(/\*\*Stats:\*\*\s*(.+)/i);
    const statsLine = statsMatch ? statsMatch[1] : '';

    const starsMatch = statsLine.match(/`?([\d,]+)`?\s+stars/i);
    const forksMatch = statsLine.match(/`?([\d,]+)`?\s+forks/i);
    const issuesMatch = statsLine.match(/`?([\d,]+)`?\s+open issues/i);
    const langMatch = statsLine.match(/Language:\s*`([^`]+)`/i);
    const licenseMatch = statsLine.match(/License:\s*`?([^·\r\n]+?)`?(?:\s*·|\s*$)/i);

    const activityMatch = block.match(/\*\*Activity:\*\*\s*(.+)/i);
    const activityLine = activityMatch ? activityMatch[1] : '';
    const createdMatch = activityLine.match(/Created\s+`([^`]+)`/i);
    const pushedMatch = activityLine.match(/Pushed\s+`([^`]+)`/i);
    const releaseMatch = activityLine.match(/(?:Latest|Desktop)?\s*Release:\s*`([^`]+)`/i);

    const summaryMatch = block.match(/\*\*Summary:\*\*\s*([\s\S]*?)(?=\r?\n\s*####\s+How to Apply|\r?\n---|$)/i);
    const summary = summaryMatch
      ? summaryMatch[1].replace(/\r?\n\s*/g, ' ').trim()
      : '';

    const applyMatch = block.match(/####\s+How to Apply in Your Environment\s*\r?\n([\s\S]*?)(?=\r?\n---|\r?\n###\s+|$)/i);
    const applyRaw = applyMatch ? applyMatch[1].trim() : '';
    const apply = parseApplySection(applyRaw);

    const language = langMatch ? langMatch[1].trim() : 'Unknown';
    const compatibility = classifyCompatibility(applyRaw, summary, language);

    repos.push({
      id: fullName,
      owner,
      name,
      rank,
      category,
      reportDate,
      url,
      stars: parseIntSafe(starsMatch?.[1]),
      forks: parseIntSafe(forksMatch?.[1]),
      openIssues: parseIntSafe(issuesMatch?.[1]),
      language,
      license: licenseMatch ? licenseMatch[1].replace(/`/g, '').trim() : 'Unspecified',
      created: createdMatch ? createdMatch[1].trim() : '',
      pushed: pushedMatch ? pushedMatch[1].trim() : '',
      release: releaseMatch ? releaseMatch[1].trim() : '',
      summary,
      apply,
      compatibility,
    });
  }

  return repos;
}

export function parseReportMarkdown(filename, markdown) {
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})\.md$/);
  const date = dateMatch ? dateMatch[1] : filename.replace(/\.md$/, '');

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `GitHub Daily Report — ${date}`;

  const baseline = parseBaselineTable(markdown);

  const part1Match = markdown.match(
    /##\s+Part 1:\s+Popular & Trending Repositories[\s\S]*?(?=\r?\n##\s+Part 2:|$)/i
  );
  const part2Match = markdown.match(/##\s+Part 2:\s+New Rising Repositories[\s\S]*$/i);

  const popular = part1Match ? parseRepoSection(part1Match[0], 'popular', date) : [];
  const rising = part2Match ? parseRepoSection(part2Match[0], 'rising', date) : [];

  return {
    date,
    filename,
    title,
    baseline,
    popular,
    rising,
    totalProjects: popular.length + rising.length,
  };
}

export async function loadAllReports(reportsDir) {
  let entries = [];
  try {
    entries = await fs.readdir(reportsDir, { withFileTypes: true });
  } catch {
    return { reports: [], latestDate: null, baseline: [] };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => b.localeCompare(a));

  const reports = [];
  for (const file of mdFiles) {
    const content = await fs.readFile(path.join(reportsDir, file), 'utf8');
    reports.push(parseReportMarkdown(file, content));
  }

  const latestDate = reports.length > 0 ? reports[0].date : null;
  const baseline = reports.length > 0 ? reports[0].baseline : [];

  return {
    generatedAt: new Date().toISOString(),
    latestDate,
    reportCount: reports.length,
    baseline,
    reports,
  };
}
