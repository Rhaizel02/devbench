# DevBench

A focused, local-first developer workbench. **Block B1:** SvelteKit foundation, Home and a fully functional JSON Studio. The UI is in English.

Repository: [Rhaizel02/devbench](https://github.com/Rhaizel02/devbench). The source is published on GitHub; website deployment remains outside B1.

## Run locally

Requires **Node 24 LTS** and npm. Install dependencies and start the development server:

```sh
npm ci
npm run dev -- --open
```

On this computer, `start-dev.ps1` selects the bundled Node 24 runtime without changing the system installation. Install dependencies first if `node_modules` is absent.

```sh
npm run check
npm run lint
npm run test
npm run build
npm run preview:static
```

The static preview is available at `http://127.0.0.1:4173/`. It serves generated files without an SPA fallback. The standard Vite preview is also available with `npm run preview`.

Browser checks:

```sh
npx playwright install chromium
npm run test:e2e
```

## Available in B1

- Home with category filtering, directory search, Ctrl/Cmd+K command palette, favorites and up to six recent tools.
- Dark (initial default), light and system themes; responsive navigation and mobile drawer.
- Quick Paste detects likely JSON/JWT/URL/SQL locally. JSON transfers only after an explicit click. Other destinations are marked **Coming later**.
- JSON Studio: strict validation; format with 2 spaces, 4 spaces or tabs; minify; CodeMirror input and read-only output; line wrapping; Code/Tree views; expand/collapse; key/value search; copy values, JSONPath or JSON Pointer; copy output; JSON download; synthetic example; reset.
- All twelve V1 tools have static routes. The other eleven are honest **Coming later** pages. The six V1.1 tools are an informational roadmap.

## Privacy

Inputs and outputs remain in interface memory. They are not uploaded, logged, placed in URLs or saved in browser storage. Navigating away or reloading clears the workspace. Quick Paste transfers once using context created for the current layout instance, with no shared mutable server payload.

Only `devbench.preferences.v1` is written to localStorage: a theme, favorite tool IDs, and recent tool IDs/timestamps. Invalid metadata is discarded; storage failures do not prevent use. Clipboard access and download are explicit actions. Clipboard failures are reported without claiming success.

Fonts and all runtime assets are bundled locally. There is no backend, analytics, authentication, service worker or CDN dependency. Serving the app still loads static assets over the network.

## Architecture

Svelte 5 runes, SvelteKit 3, strict TypeScript 6, Vite, Tailwind CSS 4, Lucide and CodeMirror 6. SvelteKit configuration lives in Vite; native package import aliases use explicit file extensions. An authoritative typed registry drives navigation, Home, palette and prerender entries.

Home and the twelve V1 tool routes are prerendered with trailing slashes and build-time SSR. JSON Studio is dynamically imported; CodeMirror is mounted only in the browser and destroyed on unmount. Pure TypeScript engines handle JSON, detection and preference validation separately from the UI.

`npm run build` creates `build/`, ready for static hosting. The bundled `404.html` prevents implicit SPA fallback on compatible hosts such as Cloudflare Pages. Hosting is outside B1.

## Limits and behavior

- Input limit: **5 MiB of UTF-8**. Processing is explicit rather than automatic while typing.
- Editing invalidates the previous output immediately. Validate, Format or Minify creates a current result; syntax errors preserve the input.
- Root strings, numbers, booleans, arrays and `null` are valid JSON. Trailing commas are invalid.
- Native `JSON.parse` / `JSON.stringify` semantics apply: JavaScript numeric precision, key order and duplicate-key behavior are not a lossless JSON representation.
- Tree renders 500 matching/visible nodes initially, with progressive expansion up to 5,000. Traversal is bounded at 50,000 nodes and 128 levels of depth; indentation is visually capped. Very large documents remain usable in Code view; tree limitations are disclosed.
- Syntax locations are shown when the browser's parser supplies them. Error messages do not repeat potentially sensitive input snippets.
- JSONPath uses bracket notation, for example `$["items"][0]`; JSON Pointer escapes `~` and `/`.
- Basic text search is available through CodeMirror's native Ctrl/Cmd+F and the tree search field.

## Verification and references

`screenshots/01–08` are preserved design references, not claims of application behavior. Actual browser captures are saved in `screenshots/actual/` after QA. GitHub Actions runs check, lint, unit tests, static build and three browser smoke scenarios.

See `VALIDATION.md` for the final results and remaining P2 items. B2 follows `ROADMAP.md`: JSON Diff, JSON ↔ YAML, Base64 Toolkit and URL Toolkit.
