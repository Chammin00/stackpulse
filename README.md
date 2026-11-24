# Fresh New TeCH (StackPulse) — Open-Source GitHub Intelligence

**Fresh New TeCH** is a daily open-source intelligence dashboard and installable Progressive Web App (PWA) that tracks breakout GitHub repositories—combining popular high-velocity projects and newly created 7-day rising repositories with environment-verified setup playbooks and an interactive PowerShell **Stack Script Builder**.

---

## Features

- **Multi-Horizon Intelligence Feed:** Switch between **Today (24h)**, **Past 3 Days**, **1 Week**, and **1 Month** windows across popular and newly created rising repositories.
- **Use-Case & Goal Spotlights:** One-click filters and multi-tool blueprints for **Local AI Agents**, **Replace Paid SaaS & Docker**, **Zero-Install & Offline Apps**, **Video, Graphics & Hardware**, **Dev & Reverse Engineering**, **Gaming & Emulators**, and **VR, WebXR & Spatial 3D**.
- **Open-Source Alternative Finder:** Instantly match commercial or heavy tools (Docker Desktop, Zapier, Cursor, Raycast, OpusClip, Adobe Photoshop) to lightweight open-source replacements.
- **Quick-Select Code & Stack Script Builder:**
  - Select individual command lines, code blocks, or all commands inside any tool's playbook (`Select All`, `Copy Selected`, `Select Text`).
  - Batch-select repositories (`Select Page`, `Select Filtered`, `Clear`) to generate and download a combined `install-my-stack.ps1` setup script.
- **Dual Runtime (Live Local Server + Static CDN / PWA):**
  - Runs locally with live Server-Sent Events (SSE) file watching (`node server.mjs`).
  - Builds into a zero-backend static deployment (`./dist`) ready for Vercel, GitHub Pages, or offline PWA installation.

---

## Quick Start

### 1. Local Live Server (Node.js 24+)
```powershell
npm start
# Or via PowerShell launcher:
.\start.ps1
```
Opens at `http://127.0.0.1:3847` with live report reload.

### 2. Build Static Web & PWA Bundle (`./dist`)
```powershell
npm run build
```
Compiles all Markdown reports in `reports/YYYY-MM-DD.md` into `public/data/reports.json` and outputs the production static bundle to `./dist`.

### 3. Sync Daily Trending Reports via GitHub CLI (`gh`)
```powershell
npm run sync
```

---

## Project Structure

- `reports/` — Daily Markdown intelligence reports (`YYYY-MM-DD.md`).
- `lib/report-parser.mjs` — Markdown report parser, path sanitizer, and compatibility classifier.
- `public/` — Web & PWA frontend (`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`).
- `server.mjs` — Local zero-dependency Node HTTP + SSE server with security headers.
- `build.mjs` — Static site builder outputting `./dist` for Vercel ([vercel.json](vercel.json)).
