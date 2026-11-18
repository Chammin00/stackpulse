import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllReports } from './lib/report-parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, 'reports');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function build() {
  const payload = await loadAllReports(REPORTS_DIR);
  const dataDir = path.join(PUBLIC_DIR, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'reports.json'), JSON.stringify(payload, null, 2), 'utf8');

  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await copyDir(PUBLIC_DIR, DIST_DIR);

  console.log(
    `Built static deployment in ./dist (${payload.reportCount} reports, latest ${payload.latestDate})`
  );
}

build().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
