# Parent API integration

The development server is in `server/server.js` and uses only Node.js built-ins. It defaults to `127.0.0.1:4000`. Set `EXPO_PUBLIC_PARENT_API_URL` in the Expo environment to configure the mobile client. All successful responses are JSON; errors return `{ "error": "..." }`.

## Authentication and family linking

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public, rate-limited | Create a parent account (`name`, `email`, `password`; password 12–128 characters) |
| `POST` | `/api/auth/login` | Public, rate-limited | Authenticate and receive an expiring bearer token |
| `GET` | `/api/auth/me` | Bearer token | Restore the current session |
| `POST` | `/api/family/invites` | Parent | Create a one-use, ten-minute six-digit child-link code |
| `POST` | `/api/family/link` | Public, rate-limited | Consume a code with `name` and `deviceId`; returns a child token |
| `GET` | `/api/family/children` | Parent | List only the caller's linked children |

Send tokens as `Authorization: Bearer <token>`. Parent accounts can access only their own family. Child device credentials are separate and do not have parent permissions.

## Summaries, alerts, and requests

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/devices/sync` | Child | Upsert a `day`, `totalMinutes`, and optional category-minute summaries |
| `GET` | `/api/family/children/:id/usage?day=YYYY-MM-DD` | Parent | Read one linked child's daily summary |
| `POST` | `/api/devices/alerts` | Child | Record `sos` or `usage_limit`; location is optional and SOS-only |
| `GET` | `/api/family/alerts` | Parent | List family alerts |
| `POST` | `/api/family/alerts/:id/acknowledge` | Parent | Acknowledge a family alert |
| `POST` | `/api/family/children/:id/control-requests` | Parent | Send a daily-limit or focus-session suggestion |
| `GET` | `/api/devices/control-requests` | Child | List pending suggestions for this device |
| `POST` | `/api/devices/control-requests/:id/respond` | Child | Accept or decline a suggestion |

Supported usage categories are `education`, `social`, `games`, `video`, `communication`, and `other`. Current app submissions are marked `self_reported`; no system usage data is gathered. Control requests are proposals only and do not change operating-system settings. SOS entries are stored for the family feed; no push provider is configured, so the parent app must refresh to see them.

## Development storage and security boundary

The server stores password salts/hashes, family links, summaries, alerts, and pending requests in `server/data.json`; active sessions live in memory and expire after 12 hours. The file is Git-ignored and written with restrictive file mode where supported. This single-process JSON store is for local development only, not a production database. The API intentionally has no permissive cross-origin policy or public bind default. Do not deploy it publicly without HTTPS, production persistence, operational security controls, retention/deletion policy, and a complete child-data/privacy review.
