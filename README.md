# Scanly

Website Content Checker for pre-deployment validation. Scanly scans web pages for accessibility issues, broken links, empty images, and more.

## Features

- **Missing Alt Text** — detects `<img>` tags without `alt` attributes or with generic alt text (e.g. "image", "photo")
- **Broken Links** — validates all hyperlinks on a page for 4xx/5xx responses (up to 400 links per page)
- **Empty Pictures** — finds images with empty, missing, or broken `src` attributes
- **Empty Buttons** — identifies buttons and submit inputs without text, icons, or `aria-label`
- **Image Format** — analyzes image formats and suggests standardization (WebP, AVIF). Reports `unsupported-format` as warnings and `format-mix` as info-level suggestions
- **Error Rendering** — catches broken images, failed iframes, and excessive `noscript` usage
- **JavaScript Errors** — captures and reports console errors from scanned pages
- **Failed Resources** — tracks and reports HTTP 4xx/5xx resource failures
- **Fix Suggestions** — every issue includes a `suggestion` field with guidance on how to resolve it
- **Multi-language Reports** — supports English, Japanese, Chinese (Simplified & Traditional), Korean, and Malay
- **Client-side PDF Export** — generates PDF reports in the browser using `window.print()`, zero server memory cost
- **CSV Export** — spreadsheet-compatible reports with BOM for Excel

## Scan Modes

- **Quick Scan** — scans a single webpage. Enter any URL and Scanly checks that page for broken links, missing images, and accessibility issues.

> Scanly checks one webpage at a time. Enter the specific URL of the page you want to analyze (e.g., https://example.com) for faster and more accurate results.

## Installation

```bash
npm install
```

> **Note:** Playwright is a runtime dependency and requires browser binaries. Run `npx playwright install` after installing.

## Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run CLI via `tsx src/index.ts` |
| `npm run scan` | Alias for `start` |
| `npm run ui` | Run the web UI server on port 4000 |
| `npm run build:ui` | Inject API base URL into frontend files |
| `npm run dev:ui` | Inject empty API base and start server (local dev) |

## Usage

```bash
# Quick scan (text output)
npx tsx src/index.ts https://example.com

# JSON output
npx tsx src/index.ts https://example.com -f json

# HTML report to file
npx tsx src/index.ts https://example.com -f html -o report.html

# Custom timeout and page limit
npx tsx src/index.ts https://example.com --timeout 20000 --max-pages 10

# Use a config file
npx tsx src/index.ts -c scanly.config.json
```

## Web UI

Run the interactive web UI on localhost:

```bash
# Local development (injects empty API base for localhost)
npm run dev:ui

# Or manually:
npm run build:ui && npm run ui
```

The UI will be available at `http://localhost:4000`.

> **Note:** For local development, `npm run dev:ui` injects an empty API base so the frontend connects to the local server. For production deployment, the API base is injected via environment variables during the build process (see `wrangler.toml` for Cloudflare Pages, or set `SCANLY_API_BASE` for other hosts).

### UI Features

- Splash screen with click-to-begin animation
- Animated monster character with eye-tracking (pupils follow cursor)
- URL input with validation and clear button
- Quick Scan mode indicator (lightning bolt icon)
- Real-time progress bar during scans
- Stop button to abort running scans
- Terminal view with real-time scanning output
- Printer-style report view with sections for each issue type
- JavaScript errors and failed resources displayed in report
- Download reports as PDF (client-side) or CSV
- "Scan Another URL" button to restart
- Fully responsive design

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/scan` | POST | Start a scan. Body: `{ scanUrl, maxPages, timeout, maxDepth, scanMode }` |
| `/api/status` | GET | Returns `{ scanning: boolean, activeScans, activeCount }` |
| `/api/result` | GET | Returns the last scan result |
| `/api/progress` | GET | Returns `{ isScanning, currentChecker, progress, message }` |
| `/api/events` | GET | Returns real-time scan events. Query: `?scanId=&since=` |
| `/api/stop` | POST | Stops the current scan |
| `/api/download` | GET | Download report. Query: `?format=csv|pdf&scanId=&lang=` |
| `/api/health` | GET | Health check / keepalive |

> **Concurrency Limit:** Maximum 2 concurrent scans. Excess requests receive a `429` response.

## CLI Options

| Option | Description | Default |
|---|---|---|
| `[url]` | URL to scan | (required) |
| `-c, --config <path>` | Path to config file | |
| `-f, --format <format>` | Report format: text, json, html | `text` |
| `-o, --output <path>` | Output file path | stdout |
| `--max-pages <number>` | Maximum pages to crawl | `50` |
| `--timeout <ms>` | Request timeout in milliseconds | `30000` |

## Configuration

Create a `scanly.config.json` file:

```json
{
  "targetUrl": "https://example.com",
  "maxPages": 50,
  "maxDepth": 5,
  "timeout": 30000,
  "excludePatterns": ["*.pdf", "*.doc", "*.docx", "*.xls", "*.xlsx"],
  "includePatterns": [],
  "reportFormat": "text",
  "reportOutput": "",
  "checkers": {
    "missingAlt": true,
    "brokenLinks": true,
    "emptyPictures": true,
    "emptyButtons": true,
    "formatCheck": true,
    "errorRender": true
  }
}
```

> **Note:** `maxDepth`, `includePatterns`, and `excludePatterns` are defined in the config interface but not yet implemented in the scanner.

## Checker Severity

| Severity | Meaning |
|---|---|
| `error` | Must be fixed before deployment |
| `warning` | Should be reviewed and fixed |
| `info` | Informational, no action required |

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Scan complete, no errors |
| `1` | Errors found or CLI usage error |

## Architecture

```
src/
├── index.ts              # CLI entry point
├── scanner.ts            # Orchestrator — runs all checkers
├── config.ts             # Config loader
├── api.ts                # API layer — manages scan state and progress
├── server.ts             # HTTP server — serves web UI and API endpoints
├── checkers/             # Individual checkers
│   ├── base.ts           # Checker interface
│   ├── missing-alt.ts
│   ├── broken-links.ts
│   ├── empty-pictures.ts
│   ├── empty-buttons.ts
│   ├── format-checker.ts
│   └── error-render.ts
├── reporters/            # Output formatters
│   ├── text.ts
│   ├── json.ts
│   ├── html.ts
│   ├── csv.ts
│   └── pdf.ts
└── utils/                # Helpers
    ├── http.ts
    └── dom.ts
```

## License

MIT
