# Development and release setup

## Requirements

- Node.js 18 or newer and npm
- Expo-compatible iOS/Android development tools for simulator or device builds
- For Detox: Xcode and an iOS simulator on macOS, or Android SDK/Studio with an AVD

## Install and run

1. Install app dependencies from the repository root with `npm install`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_PARENT_API_URL` to an API URL reachable from the app. Expo loads `EXPO_PUBLIC_*` values into the dynamic config; restart Expo after changing it.
3. Start the API in a second terminal: `npm --prefix server start`.
4. Start Expo: `npm start`, then select the iOS or Android target.
5. Create a parent account in the app. From its dashboard, generate a one-time invite code; link the child device with that code.

The API binds to `127.0.0.1:4000` by default and stores development data in `server/data.json` (ignored by Git). A physical phone cannot reach the computer through `127.0.0.1`; for local testing, set the server's `HOST` environment variable to a trusted LAN interface and point Expo at the computer's private LAN address. Do not expose this development API to the public internet.

## Tests

- `npm test` runs Jest unit tests.
- `npm run test:api` runs the dependency-free Node API tests.
- `npm run test:e2e:build:android` then `npm run test:e2e:android` builds/runs Detox on an Android emulator.
- `npm run test:e2e:build:ios` then `npm run test:e2e:ios` builds/runs Detox on an iOS simulator (macOS only).

The Detox native projects are generated locally and ignored by Git. Set `ANDROID_AVD_NAME` if the default `Pixel_6` AVD name differs.

## Production and store checklist

- Replace `com.example.parentalcontrol` with identifiers controlled by the publisher. App identifiers cannot be changed after store publication.
- Provide app icon, adaptive icon, and store screenshots/artwork; no publisher artwork or signing identity is bundled.
- Configure EAS Build credentials through EAS or the platform's secure credential manager. Never commit keystores, certificates, provisioning profiles, or passwords.
- Publish a privacy policy and accurately declare child data, SOS/location use, retention, and sharing in Apple/Google forms. Obtain legal review for child-directed services and the relevant consent requirements.
- Replace the development JSON file with a managed database, use HTTPS, private secret management, backups, monitoring, retention/deletion controls, and a production-grade authentication review. Current API sessions are memory-only and reset on server restart; email verification, password reset, MFA, and push delivery are not implemented.
- Add and validate platform-authorized native usage/screen-time APIs before claiming automated monitoring or device enforcement. Apple Screen Time APIs require the relevant entitlements and authorization; Android usage data requires user-granted system access. Neither is included here.
