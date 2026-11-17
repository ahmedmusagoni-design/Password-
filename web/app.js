(() => {
  const root = document.getElementById('app');
  const TOKEN_KEY = 'family-safety-session';
  const apiAddress = `${location.hostname}${location.port ? `:${location.port}` : ''}`;
  const defaultRestrictionSchedule = () => ({
    homework: { enabled: false, startTime: '15:00', endTime: '17:00' },
    bedtime: { enabled: false, startTime: '21:00', endTime: '07:00' },
    prayer: {
      enabled: false,
      times: { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' },
    },
  });
  const initialMode = new URLSearchParams(location.search).get('mode') === 'child' ? 'child' : 'parent';
  const state = {
    mode: initialMode,
    registering: false,
    view: 'auth',
    user: null,
    profiles: [],
    alerts: [],
    usage: {},
    restrictionSchedules: {},
    socialMediaControls: {},
    invite: null,
    notice: null,
    error: null,
    busy: false,
    installPrompt: null,
    connection: 'checking',
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  const getToken = () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  };

  const clearToken = () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      return true;
    } catch {
      return false;
    }
  };

  async function api(route, { method = 'GET', body, authenticated = false } = {}) {
    const token = authenticated ? getToken() : null;
    let response;
    try {
      response = await fetch(route, {
      method,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      });
      state.connection = 'connected';
    } catch {
      state.connection = 'offline';
      throw new Error(
        `Could not reach the Family Safety server at ${location.origin}. Make sure the server is running, then reload this page.`,
      );
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      throw new Error(`The server returned an unreadable response (${response.status}).`);
    }
    if (!response.ok) {
      if (response.status === 401 && authenticated) {
        clearToken();
        state.user = null;
        state.view = 'auth';
        state.mode = 'parent';
      }
      throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${response.status}).`);
    }
    return payload;
  }

  function connectionLabel() {
    if (state.connection === 'connected') return 'Family API connected';
    if (state.connection === 'offline') return `API not reachable at ${apiAddress}`;
    return `Checking server at ${apiAddress}…`;
  }

  async function checkConnection() {
    try {
      const response = await fetch('/health', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Health check failed (${response.status}).`);
      const result = await response.json();
      if (result.status !== 'ok') throw new Error('The server health check did not report ok.');
      state.connection = 'connected';
    } catch {
      state.connection = 'offline';
    }
    root.querySelectorAll('[data-connection-status]').forEach((element) => {
      element.textContent = connectionLabel();
      element.classList.toggle('connection-offline', state.connection === 'offline');
    });
    root.querySelectorAll('.connection-dot').forEach((element) => {
      element.classList.toggle('connection-dot-offline', state.connection === 'offline');
    });
  }

  function formatDate(value) {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
  }

  function messageBlock() {
    if (state.error) return `<p class="message message-error" role="alert">${escapeHtml(state.error)}</p>`;
    if (state.notice) return `<p class="message message-success" role="status">${escapeHtml(state.notice)}</p>`;
    return '';
  }

  function header() {
    return `
      <header class="topbar ${state.user ? 'topbar-app' : 'topbar-auth'}">
        <a class="brand" href="/" aria-label="Family Safety home">
          <img src="/icons/family.svg" width="36" height="36" alt="">
          <span class="brand-name">Family Safety</span>
        </a>
        ${state.view === 'dashboard' ? '<span class="workspace-label">Parent workspace</span>' : ''}
        <div class="topbar-actions">
          <button class="quiet install-button" type="button" data-action="install" ${state.installPrompt ? '' : 'hidden'}>Install app</button>
          ${state.view === 'dashboard' ? `
            <button class="quiet header-action" type="button" data-action="refresh" ${state.busy ? 'disabled' : ''}>Refresh data</button>
            <span class="user-chip" aria-label="Signed in as ${escapeHtml(state.user.name)}">${escapeHtml(state.user.name.slice(0, 1).toUpperCase())}</span>
            <button class="quiet header-action" type="button" data-action="sign-out" ${state.busy ? 'disabled' : ''}>Sign out</button>
          ` : ''}
        </div>
      </header>`;
  }

  function sidebar() {
    return `
      <aside class="sidebar" aria-label="Workspace navigation">
        <p class="sidebar-heading">WORKSPACE</p>
        <nav class="side-nav">
          <a class="side-nav-link active" aria-current="page" href="#family-overview">
            <span class="nav-glyph" aria-hidden="true">⌂</span><span>Overview</span>
          </a>
          <a class="side-nav-link" href="#profiles-title">
            <span class="nav-glyph" aria-hidden="true">▣</span><span>Child devices</span>
          </a>
          <a class="side-nav-link" href="#alerts-title">
            <span class="nav-glyph" aria-hidden="true">◎</span><span>Activity &amp; alerts</span>
          </a>
        </nav>
        <div class="sidebar-bottom">
          <span class="connection-dot ${state.connection === 'offline' ? 'connection-dot-offline' : ''}" aria-hidden="true"></span>
          <span data-connection-status role="status">${escapeHtml(connectionLabel())}</span>
        </div>
      </aside>`;
  }

  function footer() {
    return `<footer class="footer"><p>
      The Edge dashboard can save schedules on this server, but cannot itself block apps. To pause
      selected apps, the child must sync them in an authorized iOS app and choose apps on that device.
      Android and Windows app blocking are not supported here. No device is shut down or locked.
    </p></footer>`;
  }

  function authContent() {
    const isChild = state.mode === 'child';
    const title = isChild ? 'Link a child device' : (state.registering ? 'Create a family account' : 'Parent sign in');
    return `
      <main class="page auth-layout">
        <section class="intro" aria-labelledby="page-title">
          <h1 id="page-title">Stay connected, without crossing privacy lines.</h1>
          <p class="lede">A family space for child-submitted daily summaries and child-initiated SOS alerts. Linking is deliberate and easy to revoke.</p>
          <ul class="rule-list">
            <li>Parents create a child profile and share an eight-digit code that expires in ten minutes.</li>
            <li>Children review what linking means and confirm on their own device before it connects.</li>
            <li>Only the summaries a child chooses to submit are shown here; they are not measured by this browser.</li>
          </ul>
        </section>
        <section class="work-area" aria-labelledby="form-title">
          <p class="api-status ${state.connection === 'offline' ? 'connection-offline' : ''}" data-connection-status role="status">${escapeHtml(connectionLabel())}</p>
          <div class="tabs" role="tablist" aria-label="Choose who is using this device">
            <button class="tab" type="button" role="tab" aria-selected="${!isChild}" data-action="mode-parent">Parent</button>
            <button class="tab" type="button" role="tab" aria-selected="${isChild}" data-action="mode-child">Child device</button>
          </div>
          ${messageBlock()}
          <h2 class="form-title" id="form-title">${title}</h2>
          ${isChild ? childForm() : parentForm()}
        </section>
      </main>`;
  }

  function parentForm() {
    return `
      <p class="form-hint">${state.registering
        ? 'Create a parent account to manage profiles, invitations, and linked-device status.'
        : 'Sign in to manage your family profiles and pending or linked devices.'}</p>
      <form id="parent-form">
        ${state.registering ? `
          <div class="field"><label for="parent-name">Your name</label>
            <input id="parent-name" name="name" autocomplete="name" maxlength="80" required></div>` : ''}
        <div class="field"><label for="email">Email address</label>
          <input id="email" name="email" type="email" autocomplete="email" maxlength="254" required></div>
        <div class="field"><label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="${state.registering ? 'new-password' : 'current-password'}" minlength="${state.registering ? 12 : 1}" maxlength="128" required></div>
        <button class="primary full-width" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Working…' : state.registering ? 'Create account' : 'Sign in'}</button>
      </form>
      <button class="switch-link" type="button" data-action="toggle-register">${state.registering ? 'Already have an account? Sign in' : 'Create a parent account'}</button>
      <p class="fine-print">Your sign-in token stays in this browser tab and is cleared when you sign out or close the tab.</p>`;
  }

  function childForm() {
    return `
      <p class="form-hint">Use the code from your parent. Linking is optional; do not continue if you did not expect this invitation.</p>
      <form id="child-form">
        <div class="field"><label for="invite-code">Eight-digit invite code</label>
          <input id="invite-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{8}" maxlength="8" placeholder="00000000" required></div>
        <div class="notice">
          <strong>What happens if you link</strong><br>
          This browser is connected to the family that gave you the code. Your parent can see your profile
          and when this browser links. This browser-only flow does not submit summaries or SOS alerts.
          If you mean to use the native child app, enter the code there instead; the code works only once.
          Neither app reads messages, other apps, browsing, or background location.
        </div>
        <label class="consent" for="child-consent">
          <input id="child-consent" name="consent" type="checkbox" required>
          <span>I understand what is shared and choose to link this device.</span>
        </label>
        <button class="primary full-width" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Linking…' : 'Link this device'}</button>
      </form>
      <p class="fine-print">The code works once and expires in ten minutes. If it has expired or does not match, ask the parent to create a fresh invitation.</p>`;
  }

  function profileMarkup(profile) {
    const usage = state.usage[profile.id];
    const schedule = state.restrictionSchedules[profile.id] || defaultRestrictionSchedule();
    const socialControl = state.socialMediaControls[profile.id] || {
      paused: false,
      revision: 0,
      updatedAt: null,
      acknowledgedAt: null,
      acknowledgedRevision: null,
      appliedPaused: null,
    };
    const controlApplied = socialControl.acknowledgedRevision === socialControl.revision
      && socialControl.appliedPaused === socialControl.paused;
    const socialControlStatus = !socialControl.updatedAt
      ? 'No pause request has been sent.'
      : controlApplied
        ? socialControl.paused
        ? 'The child app acknowledged the Screen Time pause request.'
        : 'The child app acknowledged the resume request.'
        : 'Pending: the child’s iOS app must be open and online.';
    const status = profile.linked
      ? `<span class="status status-linked">Linked</span>`
      : `<span class="status status-pending">Waiting for child</span>`;
    const detail = profile.linked
      ? usage?.updatedAt
        ? `${usage.totalMinutes} min self-reported today · updated ${escapeHtml(formatDate(usage.updatedAt))}`
        : profile.lastSyncAt
          ? `Last device sync ${escapeHtml(formatDate(profile.lastSyncAt))} · no summary for today`
          : 'Linked, but no daily summary has been submitted.'
      : profile.inviteExpiresAt
        ? `Invite expires ${escapeHtml(formatDate(profile.inviteExpiresAt))}. Share the code with the child.`
        : 'No active invite. Remove this pending profile and create a fresh one.';
    return `
      <li class="profile">
        <div class="profile-main">
          <p class="profile-name">${escapeHtml(profile.name)}</p>
          <p class="profile-meta">${status}<br>${detail}</p>
          ${profile.linkedAt ? `<p class="profile-meta">Device linked ${escapeHtml(formatDate(profile.linkedAt))}</p>` : ''}
          ${profile.linked ? `
            <div class="remote-social-control">
              <label class="remote-social-toggle">
                <span class="remote-social-copy">
                  <strong>Pause selected social apps</strong>
                  <small>${escapeHtml(socialControlStatus)}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label="Pause selected social apps for ${escapeHtml(profile.name)}"
                  data-social-control
                  data-child-id="${escapeHtml(profile.id)}"
                  ${socialControl.paused ? 'checked' : ''}
                  ${state.busy ? 'disabled' : ''}>
              </label>
              <p>Only individually selected apps on an authorized iPhone or iPad are affected. The child app must be open and connected. Screen Time restricts access; it does not force-close apps or remove them from the app switcher.</p>
            </div>` : ''}
          ${profile.linked ? restrictionScheduleForm(profile, schedule) : ''}
        </div>
        <button class="danger-button profile-action" type="button" data-action="remove-profile" data-profile-id="${escapeHtml(profile.id)}" ${state.busy ? 'disabled' : ''}>
          ${profile.linked ? 'Unlink device' : 'Remove pending profile'}
        </button>
      </li>`;
  }

  function restrictionScheduleForm(profile, schedule) {
    const timedFields = (key, title) => `
      <fieldset class="schedule-period">
        <legend>${title}</legend>
        <label class="schedule-toggle">
          <input name="${key}Enabled" type="checkbox" ${schedule[key].enabled ? 'checked' : ''}>
          <span>Pause selected apps</span>
        </label>
        <div class="schedule-times">
          <label>Start <input name="${key}Start" type="time" value="${escapeHtml(schedule[key].startTime)}" required></label>
          <label>End <input name="${key}End" type="time" value="${escapeHtml(schedule[key].endTime)}" required></label>
        </div>
      </fieldset>`;
    const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return `
      <details class="restriction-editor">
        <summary>App schedules</summary>
        <p>These daily times use the child device’s local clock and are saved on this server. The child’s authorized iOS app must sync, select apps, and approve Screen Time before it can pause them. Prayer windows last 15 minutes. Unlinking removes the server schedule, but the child must sync again from the native app to clear restrictions already stored on that device.</p>
        <form class="schedule-form" data-child-id="${escapeHtml(profile.id)}">
          ${timedFields('homework', 'Homework')}
          ${timedFields('bedtime', 'Bedtime')}
          <fieldset class="schedule-period">
            <legend>Prayer times</legend>
            <label class="schedule-toggle">
              <input name="prayerEnabled" type="checkbox" ${schedule.prayer.enabled ? 'checked' : ''}>
              <span>Pause selected apps for 15 minutes after each time</span>
            </label>
            <div class="prayer-times">
              ${prayerNames.map((name) => `
                <label>${name[0].toUpperCase() + name.slice(1)}
                  <input name="prayer-${name}" type="time" value="${escapeHtml(schedule.prayer.times[name])}" ${schedule.prayer.enabled ? 'required' : ''}>
                </label>`).join('')}
            </div>
          </fieldset>
          <button class="secondary schedule-save" type="submit" ${state.busy ? 'disabled' : ''}>Save app schedules</button>
        </form>
      </details>`;
  }

  function alertMarkup(alert, names) {
    const childName = names.get(alert.childId) || 'Child profile';
    const title = alert.type === 'sos' ? 'SOS alert' : 'Screen-time notice';
    return `
      <li class="alert">
        <div>
          <span class="status-pill ${alert.acknowledgedAt ? 'status-pill-seen' : ''}">${alert.acknowledgedAt ? 'Seen' : 'New'}</span>
          <h3>${title} · ${escapeHtml(childName)}</h3>
          <p>${escapeHtml(formatDate(alert.createdAt))}${alert.location ? ' · SOS location shared' : ''}</p>
        </div>
      </li>`;
  }

  function dashboardContent() {
    const names = new Map(state.profiles.map((profile) => [profile.id, profile.name]));
    const profiles = state.profiles.length
      ? `<ul class="profile-list">${state.profiles.map(profileMarkup).join('')}</ul>`
      : '<p class="empty">No child profiles yet. Create a profile, then share its one-time code with the child.</p>';
    const alerts = state.alerts.length
      ? `<ul class="alert-list">${state.alerts.map((alert) => alertMarkup(alert, names)).join('')}</ul>`
      : '<p class="empty">No alerts have been shared with this family.</p>';
    return `
      <main class="page">
        ${messageBlock()}
        <div class="dashboard-head" id="family-overview">
          <div><h1>Family overview</h1><p>Manage invitations, linked devices, and the information your family shares.</p></div>
        </div>
        <div class="dashboard-grid">
          <section class="section" aria-labelledby="invite-title">
            <div class="section-heading">
              <div><span class="section-icon" aria-hidden="true">+</span><h2 id="invite-title">Add a child</h2></div>
              <p>Use a first name or nickname only. The child links their own device after reviewing the sharing notice.</p>
            </div>
            <form class="invite-form" id="invite-form">
              <div class="field"><label for="child-name">Child profile name</label>
                <input id="child-name" name="childName" autocomplete="off" maxlength="80" required></div>
              <button class="primary full-width" type="submit" ${state.busy ? 'disabled' : ''}><span aria-hidden="true">+</span> ${state.busy ? 'Creating…' : 'Create profile & invite'}</button>
            </form>
            ${state.invite ? `
              <div class="invite-result" role="status" aria-live="polite">
                <h3>Share this one-time code with ${escapeHtml(state.invite.childName || 'the child')}</h3>
                <p class="invite-code" aria-label="Invite code ${escapeHtml(state.invite.code)}">${escapeHtml(state.invite.code)}</p>
                <p class="invite-expiry">Expires at ${escapeHtml(formatDate(state.invite.expiresAt))}. It can be used once. Share it directly, not in a public place.</p>
              </div>` : ''}
          </section>
          <section class="section" aria-labelledby="profiles-title">
            <div class="section-heading">
              <div><span class="section-icon" aria-hidden="true">▣</span><h2 id="profiles-title">Child devices</h2></div>
              <p>Unlinking revokes the API session and removes saved summaries, alerts, and server schedules. Previously installed iOS restrictions must be cleared from the child app.</p>
            </div>
            ${profiles}
          </section>
        </div>
        <section class="section alerts-section" aria-labelledby="alerts-title">
          <div class="section-heading"><div><span class="section-icon" aria-hidden="true">◎</span><h2 id="alerts-title">Activity &amp; alerts</h2></div><p>Alerts appear when the parent view refreshes; push notifications are not configured.</p></div>
          ${alerts}
        </section>
        <section class="privacy-band" aria-labelledby="privacy-title">
          <h2 id="privacy-title">A clear boundary</h2>
          <p>Daily totals shown here are self-reported by the child app, not measured by Windows or Edge. Schedules and social-app pause requests only affect individual apps selected on the authorized iOS device. The child app must be open and connected to receive a parent switch change. This PWA cannot see app usage, block apps itself, track location in the background, or remotely lock or shut down a device. Android and Windows app blocking are not supported. SOS location is optional and only shared from the supported child app after the child starts an SOS. Unlink a device above to revoke its session.</p>
        </section>
      </main>`;
  }

  function childSuccessContent() {
    return `
      <main class="page success-panel">
        ${messageBlock()}
        <div class="success-mark" aria-hidden="true">✓</div>
        <h1>Device linked</h1>
        <p class="lede">This browser is now connected to ${escapeHtml(state.user?.name || 'your family')}’s profile. You can close this tab; the parent can remove this device at any time.</p>
        <div class="notice"><strong>What this means</strong><br>
          This browser link shows profile and connection status only; it does not submit summaries or SOS
          alerts. To use a supported native child app, ask the parent to remove this browser profile and
          create a fresh invite, then redeem the new code in that native app. A code can link only one device.
          Linking does not expose messages, other apps, or live location.
        </div>
        <button class="switch-link" type="button" data-action="child-done">Return to start</button>
      </main>`;
  }

  function render() {
    const isParentDashboard = state.view === 'dashboard';
    const content = state.view === 'dashboard'
      ? dashboardContent()
      : state.view === 'child-success'
        ? childSuccessContent()
        : authContent();
    root.innerHTML = `
      <div class="${isParentDashboard ? 'app-shell' : 'auth-shell'}">
        ${header()}
        ${isParentDashboard ? sidebar() : ''}
        <div class="main-content">${content}${footer()}</div>
      </div>`;
  }

  async function loadDashboard() {
    const [profileResult, alertResult] = await Promise.all([
      api('/api/family/profiles', { authenticated: true }),
      api('/api/family/alerts', { authenticated: true }),
    ]);
    state.profiles = profileResult.profiles;
    state.alerts = alertResult.alerts;
    const today = new Date().toISOString().slice(0, 10);
    const summaries = await Promise.all(state.profiles.filter((profile) => profile.linked).map(async (profile) => {
      const result = await api(`/api/family/children/${encodeURIComponent(profile.id)}/usage?day=${today}`, { authenticated: true });
      return [profile.id, result.usage];
    }));
    state.usage = Object.fromEntries(summaries);
    const schedules = await Promise.all(state.profiles.filter((profile) => profile.linked).map(async (profile) => {
      const result = await api(`/api/family/children/${encodeURIComponent(profile.id)}/restriction-schedule`, { authenticated: true });
      return [profile.id, result.schedule];
    }));
    state.restrictionSchedules = Object.fromEntries(schedules);
    const socialControls = await Promise.all(state.profiles.filter((profile) => profile.linked).map(async (profile) => {
      const result = await api(`/api/family/children/${encodeURIComponent(profile.id)}/social-media-control`, { authenticated: true });
      return [profile.id, result.control];
    }));
    state.socialMediaControls = Object.fromEntries(socialControls);
  }

  function setMode(mode) {
    state.mode = mode;
    state.registering = false;
    state.error = null;
    state.notice = null;
    state.view = 'auth';
    history.replaceState(null, '', mode === 'child' ? '/?mode=child' : '/');
    render();
  }

  function saveToken(token) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch {
      state.error = 'This browser tab cannot store a temporary sign-in. Enable session storage and try again.';
      return false;
    }
  }

  function getDeviceId() {
    if (typeof crypto.randomUUID === 'function') return `web-${crypto.randomUUID()}`;
    if (typeof crypto.getRandomValues !== 'function') {
      throw new Error('This browser cannot securely link a device. Open Family Safety in an up-to-date browser and try again.');
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `web-${id}`;
  }

  async function finishParentSignIn(result) {
    if (!saveToken(result.token)) {
      render();
      return;
    }
    state.user = result.user;
    state.view = 'dashboard';
    state.error = null;
    state.notice = null;
    await loadDashboard();
  }

  root.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.matches('[data-social-control]')) {
      const childId = input.dataset.childId;
      const paused = input.checked;
      if (!childId || state.busy) return;
      state.busy = true;
      state.error = null;
      state.notice = null;
      render();
      api(`/api/family/children/${encodeURIComponent(childId)}/social-media-control`, {
        method: 'PUT',
        authenticated: true,
        body: { paused },
      }).then(({ control }) => {
        state.socialMediaControls[childId] = control;
        state.notice = paused
          ? 'Pause requested. It will apply when the child’s iOS app is open and connected.'
          : 'Resume requested. It will apply when the child’s iOS app is open and connected.';
      }).catch((error) => {
        state.error = error instanceof Error ? error.message : 'Could not update the social-app control.';
      }).finally(() => {
        state.busy = false;
        render();
      });
      return;
    }
    if (input.name !== 'prayerEnabled') return;
    const form = input.closest('.schedule-form');
    if (!form) return;
    form.querySelectorAll('input[name^="prayer-"]').forEach((timeInput) => {
      timeInput.required = input.checked;
    });
  });

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || state.busy) return;
    state.busy = true;
    state.error = null;
    state.notice = null;
    render();

    try {
      const formData = new FormData(form);
      if (form.id === 'parent-form') {
        const body = Object.fromEntries(formData.entries());
        const route = state.registering ? '/api/auth/register' : '/api/auth/login';
        const result = await api(route, { method: 'POST', body });
        await finishParentSignIn(result);
      } else if (form.id === 'invite-form') {
        const childName = String(formData.get('childName') || '').trim();
        const result = await api('/api/family/invites', {
          method: 'POST',
          authenticated: true,
          body: { childName },
        });
        state.invite = result;
        state.notice = `A one-time invitation for ${result.childName} is ready.`;
        await loadDashboard();
      } else if (form.matches('.schedule-form')) {
        const childId = form.dataset.childId;
        const enabled = (name) => formData.get(name) === 'on';
        const schedule = {
          homework: {
            enabled: enabled('homeworkEnabled'),
            startTime: String(formData.get('homeworkStart') || ''),
            endTime: String(formData.get('homeworkEnd') || ''),
          },
          bedtime: {
            enabled: enabled('bedtimeEnabled'),
            startTime: String(formData.get('bedtimeStart') || ''),
            endTime: String(formData.get('bedtimeEnd') || ''),
          },
          prayer: {
            enabled: enabled('prayerEnabled'),
            times: Object.fromEntries(
              ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((name) => [
                name,
                String(formData.get(`prayer-${name}`) || ''),
              ]),
            ),
          },
        };
        const result = await api(
          `/api/family/children/${encodeURIComponent(childId)}/restriction-schedule`,
          { method: 'PUT', authenticated: true, body: { schedule } },
        );
        state.restrictionSchedules[childId] = result.schedule;
        state.notice = 'Schedules saved. The child must sync them in the authorized iOS app to apply app restrictions.';
      } else if (form.id === 'child-form') {
        const result = await api('/api/family/link', {
          method: 'POST',
          body: {
            code: String(formData.get('code') || '').trim(),
            deviceId: getDeviceId(),
            consentAccepted: formData.get('consent') === 'on',
          },
        });
        state.user = result.user;
        state.view = 'child-success';
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'The request could not be completed.';
    } finally {
      state.busy = false;
      render();
    }
  });

  root.addEventListener('click', async (event) => {
    const navLink = event.target.closest('a.side-nav-link');
    if (navLink) {
      root.querySelectorAll('.side-nav-link').forEach((link) => {
        link.classList.toggle('active', link === navLink);
        if (link === navLink) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      return;
    }
    const button = event.target.closest('button[data-action]');
    if (!button || state.busy) return;
    const action = button.dataset.action;

    if (action === 'mode-parent') setMode('parent');
    else if (action === 'mode-child') setMode('child');
    else if (action === 'toggle-register') {
      state.registering = !state.registering;
      state.error = null;
      render();
    } else if (action === 'refresh') {
      state.busy = true;
      state.error = null;
      try {
        await loadDashboard();
        state.notice = 'Family information is up to date.';
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Could not refresh family information.';
      } finally {
        state.busy = false;
        render();
      }
    } else if (action === 'sign-out') {
      const sessionCleared = clearToken();
      state.user = null;
      state.profiles = [];
      state.alerts = [];
      state.usage = {};
      state.invite = null;
      state.view = 'auth';
      state.error = sessionCleared
        ? null
        : 'This browser could not clear the sign-in session. Close this tab to end it.';
      state.notice = null;
      render();
    } else if (action === 'remove-profile') {
      const profile = state.profiles.find((item) => item.id === button.dataset.profileId);
      if (!profile || !window.confirm(
        profile.linked
          ? `Unlink ${profile.name}'s device? This revokes its API session and deletes its saved summaries, alerts, and server schedule. Existing iOS restrictions must be cleared by syncing from that device.`
          : `Remove the pending profile for ${profile.name}? Its invite code will stop working.`,
      )) return;
      state.busy = true;
      state.error = null;
      try {
        await api(`/api/family/children/${encodeURIComponent(profile.id)}`, { method: 'DELETE', authenticated: true });
        state.invite = null;
        state.notice = `${profile.name}'s profile was removed.`;
        await loadDashboard();
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Could not remove this profile.';
      } finally {
        state.busy = false;
        render();
      }
    } else if (action === 'install') {
      if (state.installPrompt) {
        try {
          await state.installPrompt.prompt();
          state.installPrompt = null;
        } catch {
          state.error = 'Edge could not open the install prompt. Use Settings and more → Apps → Install this site as an app.';
        }
        render();
      }
    } else if (action === 'child-done') {
      state.user = null;
      state.view = 'auth';
      state.mode = 'child';
      state.error = null;
      state.notice = null;
      render();
    }
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.installPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    state.notice = 'Family Safety has been installed.';
    render();
  });

  render();
  void checkConnection();
  window.addEventListener('online', () => { void checkConnection(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      state.notice = 'The app is open, but offline loading is unavailable. Use it while connected to the server.';
      render();
    });
  }

  const token = getToken();
  if (token) {
    api('/api/auth/me', { authenticated: true })
      .then(async ({ user }) => {
        if (user.role !== 'parent') {
          clearToken();
          state.mode = 'child';
          state.notice = 'Child devices use the native companion for supported summaries and SOS features.';
          render();
          return;
        }
        state.user = user;
        state.view = 'dashboard';
        await loadDashboard();
        render();
      })
      .catch((error) => {
        state.error = error instanceof Error ? error.message : 'Could not restore the sign-in.';
        render();
      });
  }
})();
