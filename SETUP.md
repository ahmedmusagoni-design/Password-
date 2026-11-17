# Development and release setup

## Requirements

- Node.js 18 or newer and npm
- Expo-compatible iOS/Android development tools for simulator or device builds
- For Detox: Xcode and an iOS simulator on macOS, or Android SDK/Studio with an AVD
- Microsoft Edge on Windows for the installable parent web companion

## Install and run

1. Install app dependencies from the repository root with `npm install`.
2. Start the API and web companion: `npm --prefix server start`. It listens on `http://127.0.0.1:4001` by default. Set `PORT` only if you want to use another port.
3. For the native app, copy `.env.example` to `.env` and set `EXPO_PUBLIC_PARENT_API_URL` to an API URL reachable from that device. When testing through a tunnel, use the tunnel's HTTPS URL, not `localhost` or `127.0.0.1`. Expo loads `EXPO_PUBLIC_*` values into the dynamic config; restart Expo after changing it.
4. Start Expo with `npm start`, then select the iOS or Android target when using the native app.

The API and web companion store development data in `server/data.json` (ignored by Git). The server binds to `127.0.0.1:4001` by default; this is suitable for the parent app on the same Windows computer and cannot be reached from another device.

## Deploy a family-accessible HTTPS app on Render

The root `render.yaml` Blueprint defines a Node web service that serves both the parent dashboard and API over Render's HTTPS URL. It binds to Render's assigned port, uses `/health` for deployment checks, and stores its JSON database on a persistent disk mounted at `/var/data`.

1. Push this repository, including `render.yaml`, to a Git provider account connected to Render. Do not commit `.env`, `server/data.json`, credentials, or other private family data.
2. In Render, choose **New → Blueprint**, connect the repository, and review the resources before applying the Blueprint. It creates a paid web service and a 1 GB persistent disk; check Render's current pricing before confirming. The service must stay at one instance because the JSON store and sessions are process-local.
3. Wait for the deployment to become live, then open its Render-provided `https://…onrender.com` address. Check that `/health` returns `{"status":"ok"}` and create a new parent account on the hosted app.
4. Share that HTTPS address with family members. Each child device must be linked using a fresh one-time invite code; do not share parent passwords or invite codes in a public place.
5. To connect a native app, set `EXPO_PUBLIC_PARENT_API_URL` in the local `.env` to the exact Render HTTPS address (no trailing slash), restart Expo, and build/install the app. A previously built app keeps its old API URL until rebuilt. iOS app restrictions still require a custom iOS build, Apple entitlements, and on-device authorization.

The hosted service starts with an empty database. It does not import the local `server/data.json`; keep local development accounts separate and never upload that file. Render's persistent disk preserves data across deploys, but the app currently uses a single JSON file and in-memory sessions: deployments/restarts sign users out, and this setup is for a small family deployment rather than a production service. Keep the Render service and disk backed up; do not scale to multiple instances. Consider the child-data privacy and retention requirements before sharing the URL.

## Set up iOS app restrictions

Scheduled restrictions use Apple's Family Controls, Device Activity, and Managed Settings APIs. They require a custom native iOS build; they do not work in Expo Go, the web app, or Android.

1. Request Apple's **Family Controls distribution entitlement** for the app and each Screen Time extension bundle ID before distributing the app. Apple's approval is required for distribution.
2. Register the app's App Group in the Apple Developer portal. The default development identifier is `group.com.example.parentalcontrol.screentime`; update the bundle identifier and corresponding App Group together before release.
3. On macOS, set `APPLE_TEAM_ID` to your Apple Developer Team ID in the build environment. Do not commit credentials. Generate and build the iOS project with `npx expo prebuild --platform ios` and `npx expo run:ios`, or use an appropriately configured EAS iOS build.
4. On the parent dashboard served by this API, open the linked child's **App schedules**, set homework and bedtime hours, enter all five local prayer times if enabled, and save. Schedule times are stored by the API in the development JSON file.
5. On the child's iPhone or iPad, open **Study**. Select **Set up Screen Time restrictions**, approve Apple's authorization prompt, then choose individual apps in the system picker.
6. Select **Sync parent schedule**. The app fetches the latest schedule from the API and registers daily device-local Screen Time windows. Each configured prayer time blocks selected apps for 15 minutes. Schedules use the child's device local time. Sync again after the parent changes the times; updates are not pushed or applied in the background.

## Pause selected social apps from the parent dashboard

1. On the child's authorized iPhone or iPad, open **Study → Scheduled app restrictions** and approve Screen Time if needed.
2. Under **Parent social-app switch**, select the individual social apps the parent is allowed to pause. The picker does not automatically identify social apps; categories and websites are not supported.
3. Keep Family Safety open and connected on the child device. From the parent's linked-device row in the web or native parent dashboard, turn on **Pause selected social apps**. The child app checks for changes every 15 seconds while active and checks again when it returns to the foreground.
4. The parent dashboard shows whether the latest request was applied or is still pending. Turn the switch off to request resume; that change is also applied when the child app checks in.

This is not an instant remote lock: iOS suspends apps in the background, and this project has no push-notification delivery. A closed or offline child app cannot receive a new parent request. Screen Time restricts access to selected apps; it does not force-quit them or remove them from the app switcher. The switch affects only apps the child selected and Screen Time authorized; it does not block all social-media apps automatically or disable the entire device.

This feature does not power off or lock the whole device, block phone calls, measure app usage, or let the Edge PWA enforce restrictions. The parent can set times on the 4001 server, but actual app pausing requires an authorized iOS native app and local app selection. Android and Windows child-device blocking are not supported. Keep emergency and essential access available through the device's own Screen Time settings.

## Install the parent app in Microsoft Edge on Windows

1. Start the server on port 4001 in PowerShell:

   ```powershell
   npm --prefix server start
   ```

2. Open `http://localhost:4001` in Microsoft Edge on the Windows computer. `localhost` is a secure context for local development.
3. Sign in to a parent account or choose **Create a parent account**.
4. Select Edge's **Settings and more (…) → Apps → Install this site as an app**. If Edge shows an install button on the page or in the address bar, that also works. Confirm **Install**; Family Safety then opens in its own app window and appears in Windows Start.
5. To remove the installed app later, open `edge://apps`, choose Family Safety, and select **Uninstall**.

The PWA caches only its static app shell for offline opening. Sign-in, family data, invites, and alerts require a live connection to the API.

If the page displays **Could not reach the Family Safety server**, open `http://localhost:4001/health` on the same computer. It should return `{"status":"ok"}`. If it does not, start the API in the project folder with `npm --prefix server start`, then reload the app. Keep the page and API on the same address (`localhost` or `127.0.0.1`); the app sends API requests to the same host and port that served the page.

## Add a child's device

1. In the parent app, enter a first name or nickname under **Add a child**, then select **Create profile & invite**. The app creates an eight-digit code that expires after ten minutes.
2. Share the code directly with the child. Do not post it publicly; anyone holding an unused code can attempt to claim it. Each code works once, and pairing attempts are rate-limited.
3. Choose one child-device path before using the one-time code:
   - **Browser-only link:** open the same Family Safety HTTPS address in a browser, choose **Child device**, enter the code, read the sharing notice, and check **I understand what is shared and choose to link this device** before selecting **Link this device**. This links that browser for profile/status only; it does not submit summaries or SOS alerts.
   - **Native child app:** if an iOS/Android build of the companion is installed, open it, choose **Child device**, enter the child's profile name and code, review the notice, accept it, then link. The code is consumed by that device and cannot also be used in a browser.
4. Back on the parent's app, select **Refresh**. The profile changes from **Waiting for child** to **Linked**.
5. To disconnect it, select **Unlink device** on that profile and confirm. This revokes the child's API session and deletes that profile's stored summaries, alerts, and server schedule. An iOS restriction already installed on the child device is not remotely cleared: open **Study** on that device and select **Sync parent schedule**; the revoked session is detected and local restrictions are cleared. For a new connection, create a fresh profile and invite.

For local development, the child device cannot use the parent's `localhost` address. To enroll a separate phone/tablet, deploy the API and web app together on one trusted HTTPS origin and give the child that URL. The development JSON-file server is not production-ready; do not expose it publicly. A temporary trusted-LAN setup may be used for testing, but HTTP on a LAN address is not suitable for PWA installation and should not be used for sensitive production traffic.

## Capability and privacy limits

The Edge PWA is a parent management client, not a Windows child agent. It can create profiles and invitations, configure homework, bedtime, and prayer schedule times on this API, show linked-device status, display summaries the child app submits, and show alerts after refresh. The PWA cannot read usage from other apps, inspect messages or browsing, block apps itself, track location in the background, or remotely lock, restart, or shut down a device. Scheduled app shielding is available only in the authorized iOS child app: the child device must select apps and manually sync the parent's schedule after changes. Android and Windows enforcement are not implemented. Child-submitted summaries are self-reported; SOS location is optional and requested only after the child starts an SOS. No push notification provider is configured.

The browser keeps its bearer token in tab-scoped session storage and clears it on sign-out or tab close. Use HTTPS for hosted deployments. The JSON-file database and in-memory sessions are development-only.

## Connect the hosted LocalHost Manager page (development only)

The LocalHost Manager page at `https://uppish-local-link-lab.base44.app` is hosted separately; its source is not part of this repository. The API can be exposed for a short integration test, but the development server stores family data in a local JSON file and is not suitable for real family data or public deployment.

1. In PowerShell, start this server on port 4001 and allow only the exact hosted page origin:

   ```powershell
   $env:PARENT_API_ALLOWED_ORIGIN = 'https://uppish-local-link-lab.base44.app'
   npm --prefix server start
   ```

2. Confirm `http://127.0.0.1:4001/health` returns `{"status":"ok"}`.
3. In a separate PowerShell window, run an HTTPS tunnel to the loopback server using the official Cloudflare Tunnel client:

   ```powershell
   cloudflared tunnel --url http://127.0.0.1:4001
   ```

   Keep both windows open. Use the temporary `https://….trycloudflare.com` URL printed by the tunnel as the LocalHost Manager API base URL.
4. In the LocalHost Manager source/configuration, set its API base URL to that HTTPS URL (without a trailing slash), then redeploy the hosted page. The API base URL is not a secret. Do not place a bearer token in frontend configuration.
5. Test using a throwaway parent account and non-sensitive data. Stop the tunnel and server when finished; tunnel URLs are publicly reachable while active.

CORS is restricted to the configured HTTPS origin. It allows API `GET`, `POST`, `PUT`, and `DELETE`, and the `Authorization` and `Content-Type` headers. This only controls what browser JavaScript may read; it is **not authentication** and does not make the development JSON database safe to expose. Authenticated API calls still require a parent bearer token.

The API now supports parent schedule CRUD and a child-device schedule fetch, but these endpoints only store and deliver configuration; they do not enforce it. The hosted LocalHost Manager source is outside this repository, so wiring its buttons still requires editing that separate Base44 project and calling the schedule routes in `INTEGRATION_GUIDE.md`.

## Local API networking for native app tests

A physical phone cannot reach the computer through `127.0.0.1`; for local native testing only, set the server's `HOST` environment variable to a trusted LAN interface and point Expo at the computer's private LAN address. Do not expose this development API to the public internet.

## Tests

- `npm test` runs Jest unit tests.
- `npm run test:api` runs the dependency-free Node API tests, including PWA shell headers, profile enrollment, consent, expiry, replay prevention, rate limiting, family-scoped schedule storage/sync, schedule validation, CORS preflight, and unlink revocation.
- `npm run test:e2e:build:android` then `npm run test:e2e:android` builds/runs Detox on an Android emulator.
- `npm run test:e2e:build:ios` then `npm run test:e2e:ios` builds/runs Detox on an iOS simulator (macOS only).

The Detox native projects are generated locally and ignored by Git. Set `ANDROID_AVD_NAME` if the default `Pixel_6` AVD name differs.

## Production and store checklist

- Replace `com.example.parentalcontrol` with identifiers controlled by the publisher. App identifiers cannot be changed after store publication.
- Provide app icon, adaptive icon, and store screenshots/artwork; no publisher artwork or signing identity is bundled.
- Configure EAS Build credentials through EAS or the platform's secure credential manager. Never commit keystores, certificates, provisioning profiles, or passwords.
- Publish a privacy policy and accurately declare child data, SOS/location use, retention, and sharing in Apple/Google forms. Obtain legal review for child-directed services and the relevant consent requirements.
- Replace the development JSON file with a managed database, use HTTPS, private secret management, backups, monitoring, retention/deletion controls, and a production-grade authentication review. Current API sessions are memory-only and reset on server restart; email verification, password reset, MFA, and push delivery are not implemented.
- Apple Screen Time APIs require Family Controls entitlements for the app and extensions, user authorization, and validation on a physical iPhone/iPad. Apply for Apple's distribution entitlement before release. Android app enforcement and operating-system usage measurement are not implemented.
