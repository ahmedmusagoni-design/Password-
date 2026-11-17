# Parent API integration

The development server is in `server/server.js` and uses only Node.js built-ins. It defaults to `127.0.0.1:4001`. Set `EXPO_PUBLIC_PARENT_API_URL` in the Expo environment to configure the mobile client. API responses are JSON; errors return `{ "error": "..." }`. The root path serves the browser companion.

## Authentication and family linking

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public, rate-limited | Create a parent account (`name`, `email`, `password`; password 12–128 characters) |
| `POST` | `/api/auth/login` | Public, rate-limited | Authenticate and receive an expiring bearer token |
| `GET` | `/api/auth/me` | Bearer token | Restore the current session |
| `POST` | `/api/family/invites` | Parent | Create a one-use, ten-minute eight-digit child-link code; accepts optional `childName` |
| `POST` | `/api/family/link` | Public, rate-limited | Consume a code with `deviceId` and `consentAccepted: true`; legacy unnamed invites also require `name` |
| `GET` | `/api/family/children` | Parent | List only the caller's linked children |
| `GET` | `/api/family/profiles` | Parent | List pending and linked child profiles without invite codes |
| `DELETE` | `/api/family/children/:id` | Parent | Unlink a profile, revoke its sessions, and delete its saved family data |
| `GET` | `/api/family/children/:id/restriction-schedule` | Parent | Read one child profile's schedule, or its disabled defaults |
| `PUT` | `/api/family/children/:id/restriction-schedule` | Parent | Save that child's homework, bedtime, and prayer schedule |
| `GET` | `/api/devices/restriction-schedule` | Linked child | Fetch the schedule assigned to this child device |

Web-created invitations include `childName`, creating a pending child profile before the child links. The API returns an eight-digit code once; only its SHA-256 hash is stored. Codes expire after ten minutes, are single-use, and pairing is limited to five attempts per client IP in a fifteen-minute window. A child link request must include `consentAccepted: true`. For invitations made without a named profile, the child request must also include `name`; named invitations bind the device to the existing profile and do not require the child to submit another name. A family may have at most ten active invitations. Removing a pending profile invalidates its invite; removing a linked profile also revokes device sessions and deletes its summaries, alerts, requests, and server schedule. The server cannot immediately clear Screen Time restrictions already installed on an offline iOS device. When that device next manually syncs, its revoked session is detected and local restrictions are cleared.

The Edge PWA is served from the same origin as the API by `npm --prefix server start`; this avoids permissive cross-origin access. Its bearer token is held in browser tab-scoped session storage. Deploy the web app and API together behind HTTPS before using a separate child device. The included JSON-file server remains development-only.

For a temporary hosted-front-end integration test, set `PORT=4001` and `PARENT_API_ALLOWED_ORIGIN=https://uppish-local-link-lab.base44.app` before starting the server, then tunnel `http://127.0.0.1:4001` over HTTPS. The server answers CORS preflights only for that exact configured HTTPS origin. CORS is not authentication; protect API routes with the parent bearer token and use only throwaway data while tunneling the development server.

The LocalHost Manager frontend can save schedule settings with:

```http
PUT /api/family/children/{childId}/restriction-schedule
Authorization: Bearer <parent-session-token>
Content-Type: application/json
```

```json
{
  "schedule": {
    "homework": { "enabled": true, "startTime": "15:00", "endTime": "17:00" },
    "bedtime": { "enabled": true, "startTime": "21:00", "endTime": "07:00" },
    "prayer": {
      "enabled": true,
      "times": { "fajr": "05:30", "dhuhr": "12:15", "asr": "15:45", "maghrib": "18:10", "isha": "19:30" }
    }
  }
}
```

All times use 24-hour `HH:mm` values interpreted using the child device's local clock. If prayer restrictions are enabled, all five times are required; each creates a 15-minute window. The child native app reads the saved schedule using `GET /api/devices/restriction-schedule`; the route requires that child's bearer token. No schedule payload includes app names or app-selection tokens.

The schedule endpoints store/deliver configuration only; they do not remotely enforce app restrictions. After a parent saves a schedule, the child must open the native iOS app and choose **Sync parent schedule**. iOS Screen Time authorization and the selected app list remain on the child device. There is no push delivery or background schedule refresh.

Send the session token in an `Authorization` header using the Bearer scheme. Parent accounts can access only their own family. Child device credentials are separate and do not have parent permissions.

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

The server stores password salts/hashes, family links, summaries, alerts, pending requests, and schedule times in `server/data.json`; active sessions live in memory and expire after 12 hours. The file is Git-ignored and written with restrictive file mode where supported. This single-process JSON store is for local development only, not a production database. The API intentionally has no permissive cross-origin policy or public bind default. Do not deploy it publicly without HTTPS, production persistence, operational security controls, retention/deletion policy, and a complete child-data/privacy review.
