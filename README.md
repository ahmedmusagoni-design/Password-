# Family Safety App

An Expo React Native app for parent/child family accounts, child-submitted daily screen-time summaries, one-time device linking, SOS alerts, and local study-plan timers.

## What works

- Parents can create an account, link a child device with a short-lived one-use code, view submitted daily totals, review/acknowledge SOS alerts, and send a screen-time suggestion.
- Children can link a device, explicitly submit a self-reported daily total, view and answer parent suggestions, and trigger an SOS alert. Location is optional and requested only after the child starts SOS.
- The Node.js API scopes child data to its family, hashes passwords, issues expiring bearer sessions, limits sign-in/pairing attempts, and stores only category/total summaries plus optional SOS coordinates.
- Study schedules and focus timers are local planning aids.

## Platform and privacy limits

This Expo build does **not** read usage from other apps, inspect social-media content or messages, block apps, or remotely lock, restart, or shut down a device. iOS and Android require dedicated, authorized native platform integrations for any device-level screen-time controls; those integrations are not included. Usage numbers shown to a parent are explicitly self-reported, not measured by the operating system. Study plans do not enforce restrictions.

The family alert feed is available when the app refreshes and can record SOS events; push notification delivery is not configured. Location is sent only with a child-initiated SOS and is omitted when permission is declined. The app does not collect continuous background location.

## Run locally

See [SETUP.md](SETUP.md) for app/API setup, tests, and local-device networking. The server API contract is in [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).

## App Store preparation

EAS build profiles are in `eas.json`; they contain no signing credentials. Before submission, replace the example iOS bundle identifier and Android package name in `app.json`, provide production app artwork, configure EAS credentials privately, and complete the store privacy disclosures and policy. A production backend must replace the development JSON-file storage and use HTTPS.
