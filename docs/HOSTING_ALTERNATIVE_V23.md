# V2.3 — alternative static hosting

Cloudflare Pages remains primary. Firebase Hosting is **configured, not deployed**: no Firebase project, credentials, account creation, DNS change or paid service is assumed or requested. This does not block V2.3. There is no Firebase client SDK, Analytics, Auth, Firestore, cloud function or synchronization.

`firebase.json` serves adapter-static's `build` output at the root with directory-index deep links and trailing slashes. No SPA rewrite exists: `404.html` remains a genuine404. HTML and nonhashed metadata revalidate; hashed `/_app/immutable/**` assets are immutable. Service worker and manifest revalidate; worker scope is root and manifest MIME is explicit. Cloudflare's equivalent rules live in `static/_headers`; host-only files are not precached or deployed as Firebase content.

## Manual deployment after project authorization

1. Create/select a Firebase project in the user's own console and enable Hosting. Do not enable other services for DevBench. Record the real project ID.
2. Use Node24.22.1, run `npm ci`, `npm run check`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e` and `npm run test:offline`.
3. Authenticate the Firebase CLI interactively (`npx firebase-tools login`) and select the actual project explicitly: `npx firebase-tools deploy --only hosting --project YOUR_REAL_PROJECT_ID`. The placeholder is an instruction, not a configured/fictitious project.
4. Verify the returned HTTPS URL normally: manifest, worker scope, exact app build SHA,30deep links/404, offline preparation and real worker/Canvas operations. Do not treat a CLI success as functional acceptance.

For future CI, prefer short-lived Google Workload Identity Federation with a narrowly scoped Hosting deployment identity. That requires the user's real project/identity-pool configuration and repository trust policy. We do not create an unauthenticated deployment workflow or commit a long-lived service-account JSON key. Firebase's [GitHub integration guide](https://firebase.google.com/docs/hosting/github-integration) documents an automated account/secret workflow; running it is a separate authorized operation, not required to prepare these files. [Official Hosting configuration](https://firebase.google.com/docs/hosting/full-config) defines static files, headers and slash behavior.

## Origins, projects and recovery

Firebase and Cloudflare have separate app installations, static caches, favorites/preferences and Canvas IndexedDB. Export Canvas JSON explicitly on the original domain and import the backup on the other; old v1/v2/v3 backups retain their existing compatibility. This transfers a copy, not synchronized edits. No application can open another origin's IndexedDB. Keep original exports until the imported project is verified. Clearing browser site data can erase projects and offline resources; offline readiness is not a backup or cloud sync.

An alternate provider reduces dependence on one infrastructure but cannot promise immunity from regional/network restrictions. Firebase deployment/HTTPS validation remains pending until an actual project and authorization exist. Configuration tests alone are not a Firebase emulator or deployed-host conformance claim.
