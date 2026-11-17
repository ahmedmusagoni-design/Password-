# Family Safety

An Expo React Native app with a same-origin installable web companion for parent/child family accounts, child-submitted daily summaries, one-time device linking, SOS alerts, and scheduled iOS app restrictions for homework, bedtime, and prayer.

## What works

- Parents can create an account, create child profiles, link a child device with an eight-digit one-use code, view submitted daily totals, review/acknowledge SOS alerts, and send a screen-time suggestion.
- Children can link a device, explicitly submit a self-reported daily total, view and answer parent suggestions, and trigger an SOS alert. Location is optional and requested only after the child starts SOS.
- The Node.js API scopes child data to its family, hashes passwords, issues expiring bearer sessions, limits sign-in/pairing attempts, and stores only category/total summaries plus optional SOS coordinates.
- Parents can set homework, bedtime, and prayer times on the 4001 web dashboard. On an authorized iPhone or iPad, the child must select individual apps and manually sync the parent schedule before Screen Time shields them. Prayer windows last 15 minutes.
- Parents can request a pause or resume for social apps selected on a linked iPhone/iPad. The child app checks the request while it is open and connected, then confirms whether Screen Time applied it.
- Study schedules and focus timers remain local planning aids; selected-app restrictions use Apple's Screen Time APIs and run on the configured child device.

## Platform and privacy limits

The app does **not** read usage from other apps, inspect social-media content or messages, force-quit apps, or lock, restart, or shut down a device. The Edge PWA can request a social-app pause but cannot block apps itself. Scheduled and parent-requested app shielding is iOS-only, requires Apple's Family Controls entitlement and on-device authorization, and affects only individual apps selected on the child device. Screen Time restricts access; it does not force-close apps or remove them from the app switcher. The child app checks parent pause requests while it is open and connected; changes cannot be delivered while it is closed or offline. Enforcement is not available in Expo Go, Android, Windows, or web builds. Usage numbers shown to a parent are explicitly self-reported, not measured by the operating system.

The family alert feed is available when the app refreshes and can record SOS events; push notification delivery is not configured. Location is sent only with a child-initiated SOS and is omitted when permission is declined. The app does not collect continuous background location.

## Run locally

See [SETUP.md](SETUP.md) for app/API setup, tests, and local-device networking. The server API contract is in [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).

## Share the family app remotely

The repository includes a Render Blueprint in `render.yaml` for an HTTPS deployment with a persistent data disk. See [SETUP.md](SETUP.md) for deployment steps and limitations. Do not expose the local development server over public HTTP or upload `server/data.json`.

## Install the Windows parent app in Edge

The browser companion is served by the API on the same origin. Start it with `npm --prefix server start`, then open `http://localhost:4001` in Microsoft Edge. Use Edge’s **Install this site as an app** command (or the install control shown by the page) to add Family Safety to Windows. Edge installation is a parent management client; it is not a Windows child-monitoring agent.

For complete installation, Apple entitlement, and child-device steps, including the HTTPS requirement when the child is on another device, see [SETUP.md](SETUP.md).

## App Store preparation

EAS build profiles are in `eas.json`; they contain no signing credentials. Before submission, replace the example iOS bundle identifier and Android package name in `app.json`, provide production app artwork, configure EAS credentials privately, and complete the store privacy disclosures and policy. A production backend must replace the development JSON-file storage and use HTTPS.
