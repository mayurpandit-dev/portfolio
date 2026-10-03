const THEME_KEY = 'deployguard.demo.theme'
const db = structuredClone(DEMO)
const state = {
  authed: false,
  view: 'dashboard',
  id: null,
  menu: null,
  sheet: false,
  theme: 'system',
  tonyOpen: false,
  tony: [],
  voiceOn: true,
  voiceError: null,
  voiceBusy: false,
  sample: "Hey, I'm Tony. I'd start with the weakest service.",
  trained: false,
  trainedAt: null,
  sampleError: null,
  inspectStep: 0,
  message: null,
  showAdd: false,
  showPassword: false,
  addForm: emptyAdd(),
  editingId: null,
  editForm: null,
  grantRoles: {},
}

const ROLES = [
  ['admin', 'Admin'],
  ['developer', 'Developer'],
  ['devops', 'DevOps engineer'],
  ['platform', 'Platform engineer'],
  ['security', 'Security team'],
  ['engineering-manager', 'Engineering manager'],
]
const STATUSES = [['active', 'Active'], ['pending', 'Pending'], ['denied', 'Denied']]
const PASSWORD_RULES = [
  ['length', 'At least 12 characters', (value) => value.length >= 12],
  ['lower', 'A lowercase letter', (value) => /[a-z]/.test(value)],
  ['upper', 'An uppercase letter', (value) => /[A-Z]/.test(value)],
  ['number', 'A number', (value) => /\d/.test(value)],
  ['symbol', 'A symbol', (value) => /[^A-Za-z0-9]/.test(value)],
]

function emptyAdd() {
  return { name: '', email: '', username: '', role: 'developer', status: 'active', reason: '', password: '' }
}
function roleLabel(role) {
  return ROLES.find(([id]) => id === role)?.[1] || role
}
function roleOptions(selected) {
  return ROLES.map(([id, label]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${esc(label)}</option>`).join('')
}
function statusOptions(selected) {
  return STATUSES.map(([id, label]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${label}</option>`).join('')
}
function passwordIssues(password) {
  return PASSWORD_RULES.filter(([, , test]) => !test(password)).map(([, label]) => label)
}
function ruleList(password) {
  return `<ul class="rules">${PASSWORD_RULES.map(([id, label, test]) => {
    const ok = test(password)
    return `<li data-rule="${id}" class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${label}</li>`
  }).join('')}</ul>`
}
function paintRules(root, password) {
  PASSWORD_RULES.forEach(([id, label, test]) => {
    const item = root.querySelector(`[data-rule="${id}"]`)
    if (!item) return
    const ok = test(password)
    item.className = ok ? 'ok' : ''
    item.textContent = `${ok ? '✓' : '○'} ${label}`
  })
}
function askedOn(iso) {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function syncAccessDrafts() {
  const add = document.querySelector('form[data-form="add-user"]')
  if (add) {
    const data = new FormData(add)
    state.addForm = {
      name: String(data.get('name') || ''),
      email: String(data.get('email') || ''),
      username: String(data.get('username') || ''),
      role: String(data.get('role') || 'developer'),
      status: String(data.get('status') || 'active'),
      reason: String(data.get('reason') || ''),
      password: String(data.get('password') || ''),
    }
  }
  const edit = document.querySelector('form[data-form="edit-user"]')
  if (edit && state.editForm) {
    const data = new FormData(edit)
    state.editForm = {
      name: String(data.get('name') || ''),
      email: String(data.get('email') || ''),
      username: String(data.get('username') || ''),
      role: String(data.get('role') || 'developer'),
      status: String(data.get('status') || 'active'),
      reason: String(data.get('reason') || ''),
    }
  }
}

const NAV = [
  ['dashboard', 'Dashboard'],
  ['applications', 'Applications'],
  ['register', 'Register'],
  ['tony', 'Tony'],
  ['access', 'Access'],
]

const STAGES = [
  ['Register handshake', 'Confirming application identity and release target.'],
  ['Application health and response time', 'Liveness, uptime, and p95 latency budget.'],
  ['Database and error handling', 'Encrypted connections, migrations, and safe failures.'],
  ['Security controls', 'Authentication, cookies, CORS, headers, rate limits, debug exposure, secrets, dependencies, uploads, and audit logs.'],
  ['Score calculation', 'Composite readiness from health 45% and security 55%.'],
  ['AI Deployment Advisor', 'Ready or not, biggest risks, fix order, approve or block.'],
  ['Deploy or block', 'Applying the production gate.'],
]

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function appById(id) { return db.applications.find((item) => item.id === id) }
function latest(id) {
  return db.inspections.filter((item) => item.applicationId === id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]
}
function verdictOf(inspection) { return inspection ? inspection.verdict : 'uninspected' }
function verdictLabel(status) {
  if (status === 'deploy') return 'Healthy'
  if (status === 'warning') return 'Warning'
  if (status === 'block') return 'Blocked'
  return 'Uninspected'
}
function badge(status, label) {
  return `<span class="badge ${esc(status)}"><i></i>${esc(label || verdictLabel(status))}</span>`
}
function due(app) { return app.scheduleEnabled && Date.parse(app.nextInspectionAt) <= Date.parse(db.now) }
function cadence(value) { return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[value] || value }
function envLabel(value) { return value[0].toUpperCase() + value.slice(1) }
function when(iso) {
  const days = Math.round((Date.parse(iso) - Date.parse(db.now)) / 86400000)
  if (Math.abs(days) >= 30) return dateLabel(iso)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}
function dateLabel(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function findings(inspection) {
  return {
    critical: inspection.checks.filter((item) => item.severity === 'critical').length,
    warning: inspection.checks.filter((item) => item.severity === 'warning').length,
  }
}
function metrics() {
  const rows = db.applications.map((app) => verdictOf(latest(app.id)))
  const scored = rows.filter((item) => item !== 'uninspected')
  const average = scored.length ? Math.round(db.applications.reduce((sum, app) => sum + (latest(app.id)?.readinessScore ?? 0), 0) / scored.length) : 0
  return {
    total: db.applications.length,
    scheduled: db.applications.filter((app) => app.scheduleEnabled).length,
    due: db.applications.filter(due).length,
    healthy: rows.filter((item) => item === 'deploy').length,
    warning: rows.filter((item) => item === 'warning').length,
    blocked: rows.filter((item) => item === 'block').length,
    uninspected: rows.filter((item) => item === 'uninspected').length,
    average,
  }
}
function mark() {
  return `<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19.5 6.6v5.8c0 5-3.2 8.4-7.5 9.6-4.3-1.2-7.5-4.6-7.5-9.6V6.6L12 3.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M8.8 12.2 11 14.5l4.3-4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>`
}
function bellIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4.2 1.4 5.8 2 6.5H4.5c.6-.7 2-2.3 2-6.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
}
function contrastIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="7.25" stroke="currentColor" stroke-width="1.6"/><path d="M12 4.75a7.25 7.25 0 0 0 0 14.5V4.75Z" fill="currentColor"/></svg>`
}
function menuIcon() {
  const open = state.sheet
  const path = open ? 'M7 7l10 10M17 7 7 17' : 'M5 7h14M5 12h14M5 17h14'
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
}
function scoreBar(score) {
  const tone = score >= 80 ? 'accent' : score >= 60 ? 'warn' : 'danger'
  return `<div class="scorebar"><div class="scorebar-top"><span>${score}</span><span>/100</span></div><div class="track"><span class="${tone}" style="width:${score}%"></span></div></div>`
}
function readout(label, score) {
  const tone = score >= 80 ? 'accent' : score >= 60 ? 'warn' : 'danger'
  return `<span class="readout"><span>${esc(label)}</span><b class="${tone}">${score}</b></span>`
}
function appearanceMenu() {
  if (state.menu !== 'theme') return ''
  const choice = (id, label, hint) => `<button class="choice ${state.theme === id ? 'on' : ''}" data-theme="${id}"><span class="radio"></span><span><b>${label}</b><span class="hint">${hint}</span></span></button>`
  return `<div class="menu appear" role="dialog" aria-label="Appearance"><p class="menu-title">Appearance</p><p class="hint">Saved on this browser.</p><div class="choices">${choice('light', 'Light', 'Always use the light theme')}${choice('dark', 'Dark', 'Always use the dark theme')}${choice('system', 'System', 'Match this device')}</div></div>`
}
function go(view, id) {
  state.view = view
  state.id = id || null
  state.menu = null
  state.sheet = false
  state.message = null
  if (view === 'inspect') state.inspectStep = 0
  if (view !== 'tony') state.tonyOpen = false
  location.hash = id ? `${view}/${id}` : view
  render()
  if (view === 'inspect') runInspect()
}

function login() {
  return `<div class="login">
    <aside class="login-aside">
      <div>
        <div class="brand">${mark()}<div><strong>DeployGuard</strong><em style="display:block">Production readiness platform</em></div></div>
        <h1>Know if a service is safe to promote — before it reaches production.</h1>
        <p class="desc">Health, security, dependencies, and audit controls in one gate. Built for admins, developers, DevOps, platform, security, and engineering managers.</p>
      </div>
      <dl class="facts"><div><dt class="hint">Gates</dt><dd>11 checks</dd></div><div><dt class="hint">Score</dt><dd>0–100</dd></div><div><dt class="hint">Decision</dt><dd>Approve or block</dd></div></dl>
    </aside>
    <main class="login-main">
      <div class="theme-float tool"><button class="icon" data-action="theme" aria-label="Appearance">${contrastIcon()}</button>${appearanceMenu()}</div>
      <div class="login-card">
        <div class="brand" style="margin-bottom:24px">${mark()}<strong>DeployGuard</strong></div>
        <h1 style="font-size:24px">Sign in</h1>
        <p class="desc">Use your work email or username. This demo signs you in locally.</p>
        <form data-form="login" style="margin-top:24px">
          <label class="field"><span>Email or username</span><input class="input" name="user" required placeholder="you@company.com" value="demo" /></label>
          <label class="field"><span>Password</span><input class="input" name="password" type="password" required value="demo-only" /></label>
          <button class="btn" type="submit" style="width:100%">Sign in</button>
        </form>
        <p class="hint" style="margin-top:16px">Demo data only. Nothing is sent to DeployGuard.</p>
      </div>
    </main>
  </div>`
}

function shell(body) {
  const pending = db.users.filter((user) => user.status === 'pending').length
  const links = NAV.map(([id, label]) => {
    const active = state.view === id || (id === 'applications' && ['application', 'inspect', 'inspection', 'report'].includes(state.view))
    const count = id === 'access' && pending ? `<span class="count">${pending}</span>` : ''
    return `<a class="${active ? 'active' : ''}" href="#${id}" data-go="${id}">${label}${count}</a>`
  }).join('')
  const notices = state.menu === 'notices' ? `<div class="menu wide" role="dialog"><div class="kicker"><strong>What Tony flagged</strong><p class="hint">New apps, inspections, and access</p></div>${db.notices.map((item) => `<button data-href="${esc(item.href)}"><strong>${esc(item.title)}</strong><p class="hint">${esc(item.body)}</p></button>`).join('') || '<p class="pad muted">Nothing in the inbox yet.</p>'}</div>` : ''
  const account = state.menu === 'account' ? `<div class="menu" role="menu"><div class="kicker name"><strong>${esc(db.operator.name)}</strong><p class="hint">Admin</p></div><button class="danger" data-action="logout">Sign out</button></div>` : ''
  return `<header class="header"><div class="topbar">
      <a class="brand" href="#dashboard" data-go="dashboard">${mark()}<span><strong>DeployGuard</strong><em>Readiness gate</em></span></a>
      <span class="rule"></span>
      <nav class="nav" aria-label="Primary">${links}</nav>
      <div class="tools">
        <div class="tool"><button class="icon" data-action="notices" aria-label="Notifications">${bellIcon()}${db.notices.length ? `<span class="ping">${db.notices.length}</span>` : ''}</button>${notices}</div>
        <div class="tool"><button class="icon" data-action="theme" aria-label="Appearance">${contrastIcon()}</button>${appearanceMenu()}</div>
        <div class="tool"><button class="account" data-action="account" aria-label="Account menu for ${esc(db.operator.name)}"><span class="avatar">DO</span><span class="who"><b>${esc(db.operator.name)}</b><span>Admin</span></span></button>${account}</div>
        <button class="icon menu-toggle" data-action="sheet" aria-label="${state.sheet ? 'Close menu' : 'Open menu'}">${menuIcon()}</button>
      </div>
    </div>
    <div class="sheet ${state.sheet ? 'open' : ''}"><p class="tiny" style="padding:4px 12px;letter-spacing:.14em;text-transform:uppercase">Navigate</p>${links}</div>
  </header>
  <main class="main">${body}</main>
  ${state.view === 'tony' ? '' : tonyDock()}`
}

function page(eyebrow, title, description, actions, inner) {
  return `<div class="head"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1>${description ? `<p class="desc">${description}</p>` : ''}</div><div class="actions">${actions || ''}</div></div>${inner}`
}

function dashboard() {
  const m = metrics()
  const scored = m.total - m.uninspected
  const posture = scored === 0 ? null : m.average >= 80 ? 'deploy' : m.average >= 60 ? 'warning' : 'block'
  const fleet = [...db.applications].sort((a, b) => {
    const rank = { block: 0, warning: 1, uninspected: 2, deploy: 3 }
    const delta = rank[verdictOf(latest(a.id))] - rank[verdictOf(latest(b.id))]
    if (delta) return delta
    return (latest(a.id)?.readinessScore ?? -1) - (latest(b.id)?.readinessScore ?? -1)
  })
  const share = (n) => m.total ? Math.round((n / m.total) * 100) : 0
  const bars = [
    ['Healthy', m.healthy, 'var(--dg-accent)'],
    ['Warning', m.warning, 'var(--dg-warn)'],
    ['Blocked', m.blocked, 'var(--dg-danger)'],
    ['Uninspected', m.uninspected, 'var(--dg-muted)'],
  ]
  const chartApps = [...db.applications].sort((a, b) => (latest(a.id)?.securityScore ?? 101) - (latest(b.id)?.securityScore ?? 101))
  const chartRows = chartApps.map((app) => {
    const item = latest(app.id)
    return `<div class="chart-row"><span>${esc(app.name)}</span><div class="hbars"><i><b class="info" style="width:${item ? item.healthScore : 0}%"></b></i><i><b class="accent" style="width:${item ? item.securityScore : 0}%"></b></i></div></div>`
  }).join('')
  const points = [...db.inspections].sort((a, b) => a.completedAt.localeCompare(b.completedAt)).slice(-12)
  return page('Operations', 'Production readiness', `${m.total} registered services · ${m.scheduled} on a recurring gate · ${m.due} due now`,
    `<button class="btn secondary" data-action="refresh">Refresh</button><button class="btn secondary" data-action="due">Run due inspections</button><a class="btn" href="#register" data-go="register">Register application</a>`,
    `${state.message ? `<p class="hint" role="status" style="margin-bottom:16px">${esc(state.message)}</p>` : ''}
    <div class="stack">
      <section class="card posture">
        <div class="posture-score">${ring(m.average, posture || 'uninspected')}<div><p class="hint">Average readiness</p><p>${posture ? verdictLabel(posture) : 'No scores yet'}</p><p class="hint">Latest result per service</p></div></div>
        <div>
          <div class="stats">
            <div class="stat"><p class="hint">Applications</p><b>${m.total}</b><p class="hint">Registered services</p></div>
            <div class="stat"><p class="hint">Healthy</p><b class="accent">${m.healthy}</b><p class="hint">Cleared to deploy</p></div>
            <div class="stat"><p class="hint">Warning</p><b class="warn">${m.warning}</b><p class="hint">Needs review</p></div>
            <div class="stat"><p class="hint">Blocked</p><b class="danger">${m.blocked}</b><p class="hint">Hold the release</p></div>
          </div>
          <div class="pad"><div class="row-top"><p class="hint">Fleet status</p><p class="hint">${m.uninspected} uninspected</p></div><div class="bar" style="margin-top:8px;background:var(--dg-panel-2)">${bars.map(([label, count, color]) => count ? `<i style="width:${share(count)}%;background:${color}" title="${label}: ${count}"></i>` : '').join('')}</div><ul class="legend">${[['Healthy', m.healthy, ''], ['Warning', m.warning, 'warn'], ['Blocked', m.blocked, 'danger'], ['Uninspected', m.uninspected, 'muted']].map(([label, count, tone]) => `<li><i class="swatch ${tone}"></i>${label} <span class="ink">${count}<span class="muted"> · ${share(count)}%</span></span></li>`).join('')}</ul></div>
        </div>
      </section>
      <div class="charts">
        <section class="card"><div class="card-h"><div><h2>Health and security</h2><p>Latest inspection for each service. Bars run from 0 to 100.</p></div></div><div class="pad"><ul class="key"><li><i class="swatch info"></i>Health</li><li><i class="swatch"></i>Security</li></ul>${chartRows}</div></section>
        <section class="card"><div class="card-h"><div><h2>Recent gate results</h2><p>Last 12 inspections, oldest to newest</p></div></div><div class="pad">${outcomeChart(points)}<p class="hint chart-note">Each point is one completed inspection. The band is the review and clear range.</p></div></section>
      </div>
      <section class="card"><div class="card-h"><div><h2>Services needing a decision</h2><p>Weakest gate first, then lowest readiness</p></div><a class="btn ghost small" href="#applications" data-go="applications">All applications</a></div>
        <div class="fleet-mobile list">${fleet.map((app) => fleetMobile(app)).join('')}</div>
        <table class="fleet-desk"><thead><tr><th>Application</th><th>Status</th><th>Readiness</th><th>Next inspect</th><th></th></tr></thead><tbody>${fleet.map((app) => fleetRow(app)).join('')}</tbody></table>
      </section>
      <section class="card"><div class="card-h"><div><h2>Inspection calendar</h2><p>${m.due} due now · ${m.scheduled} scheduled</p></div></div>
        <div class="list cal">${db.applications.map((app) => `<a href="#application/${app.id}" data-go="application" data-id="${app.id}"><div class="row-top"><div><strong>${esc(app.name)}</strong><p class="small muted">${esc(app.healthUrl)}</p><p class="small muted">${cadence(app.inspectionCadence)} · ${due(app) ? 'Due now' : when(app.nextInspectionAt)}</p></div>${due(app) ? badge('warning', 'Due') : `<span class="small muted score">${latest(app.id)?.readinessScore ?? '—'}</span>`}</div></a>`).join('')}</div>
      </section>
      <section class="card"><div class="card-h"><div><h2>Recent inspections</h2><p>Health, security, readiness, and the gate decision</p></div></div>
        <div class="list recent">${[...db.inspections].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).map((item) => {
          const app = appById(item.applicationId)
          const found = findings(item)
          return `<a href="#inspection/${item.id}" data-go="inspection" data-id="${item.id}"><div class="row-top"><strong>${esc(app?.name)}</strong>${badge(item.verdict)}</div><p class="small muted">${when(item.completedAt)} · ${dateLabel(item.completedAt)}</p><p class="small muted">${esc(app?.stack)} · On-demand inspect${found.critical ? ` · ${found.critical} critical` : ''}${found.warning ? ` · ${found.warning} warning` : ''}</p><div class="readouts">${readout('Health', item.healthScore)}${readout('Security', item.securityScore)}${readout('Score', item.readinessScore)}</div></a>`
        }).join('')}</div>
      </section>
    </div>`)
}

function ring(score, status) {
  const color = status === 'deploy' ? 'var(--dg-accent)' : status === 'warning' ? 'var(--dg-warn)' : status === 'block' ? 'var(--dg-danger)' : 'var(--dg-muted)'
  const size = 76
  const stroke = 8
  const radius = (size - stroke) / 2
  const c = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="38" cy="38" r="${radius}" fill="none" stroke="var(--dg-line)" stroke-width="${stroke}"/><circle cx="38" cy="38" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${c}" stroke-linecap="round" transform="rotate(-90 38 38)"/><text x="38" y="40" text-anchor="middle" font-size="18" font-weight="600" fill="var(--dg-ink)">${score}</text><text x="38" y="52" text-anchor="middle" font-size="9" letter-spacing="0.08em" fill="var(--dg-muted)">/ 100</text></svg>`
}
function fleetMobile(app) {
  const item = latest(app.id)
  return `<div class="row"><div class="row-top"><div><a href="#application/${app.id}" data-go="application" data-id="${app.id}"><strong>${esc(app.name)}</strong></a><p class="small muted">${esc(app.stack)} · ${esc(envLabel(app.environment))} · ${esc(app.owner)}</p></div>${badge(verdictOf(item))}</div>${item ? `<div style="margin-top:8px">${scoreBar(item.readinessScore)}<div class="readouts">${readout('Health', item.healthScore)}${readout('Security', item.securityScore)}</div></div>` : '<p class="small muted">No score yet</p>'}<p class="small muted" style="margin-top:8px">${esc(item?.summary || 'No inspection yet.')}</p><div class="row-top" style="margin-top:8px"><span class="tiny muted">${cadence(app.inspectionCadence)} · ${due(app) ? 'Due now' : when(app.nextInspectionAt)}</span><span><a class="btn secondary small" href="#application/${app.id}" data-go="application" data-id="${app.id}">Open</a> <a class="btn small" href="#inspect/${app.id}" data-go="inspect" data-id="${app.id}">Inspect</a></span></div></div>`
}
function fleetRow(app) {
  const item = latest(app.id)
  const found = item ? findings(item) : { critical: 0, warning: 0 }
  const next = due(app) ? '<p class="warn">Due now</p>' : `<p>${when(app.nextInspectionAt)}</p><p class="tiny muted">${cadence(app.inspectionCadence)} · ${dateLabel(app.nextInspectionAt)}</p>`
  return `<tr><td><a href="#application/${app.id}" data-go="application" data-id="${app.id}"><strong>${esc(app.name)}</strong></a><p class="small muted">${esc(app.stack)} · ${esc(envLabel(app.environment))} · ${esc(app.owner)}</p><p class="small muted">${esc(item?.summary || 'No inspection yet.')}</p>${found.critical ? `<p class="tiny danger">${found.critical} critical finding${found.critical === 1 ? '' : 's'}</p>` : ''}</td><td>${badge(verdictOf(item))}</td><td>${item ? `${scoreBar(item.readinessScore)}<div class="readouts">${readout('Health', item.healthScore)}${readout('Security', item.securityScore)}</div>` : '<span class="small muted">—</span>'}</td><td>${next}</td><td><a class="btn secondary small" href="#application/${app.id}" data-go="application" data-id="${app.id}">Open</a> <a class="btn small" href="#inspect/${app.id}" data-go="inspect" data-id="${app.id}">Inspect</a></td></tr>`
}
function outcomeChart(points) {
  const w = 560
  const h = 210
  const left = 28
  const right = 8
  const top = 12
  const bottom = 24
  const innerW = w - left - right
  const innerH = h - top - bottom
  const yOf = (value) => top + (1 - value / 100) * innerH
  const xOf = (index) => left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW)
  const coords = points.map((item, index) => [xOf(index), yOf(item.readinessScore)])
  const line = coords.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')
  const area = coords.length ? `${line} L${coords.at(-1)[0].toFixed(1)},${yOf(0)} L${coords[0][0].toFixed(1)},${yOf(0)} Z` : ''
  const grid = [0, 20, 40, 60, 80, 100].map((value) => `<line x1="${left}" x2="${left + innerW}" y1="${yOf(value)}" y2="${yOf(value)}" stroke="var(--dg-muted)" stroke-opacity="0.16"/>`).join('')
  const band = `<rect x="${left}" y="${yOf(80)}" width="${innerW}" height="${Math.max(0, yOf(60) - yOf(80))}" fill="var(--dg-warn)" opacity="0.1"/>`
  const guides = [60, 80].map((value) => `<line x1="${left}" x2="${left + innerW}" y1="${yOf(value)}" y2="${yOf(value)}" stroke="var(--dg-muted)" stroke-opacity="0.45" stroke-dasharray="3 5"/>`).join('')
  const dots = points.map((item, index) => {
    const color = item.verdict === 'deploy' ? 'var(--dg-accent)' : item.verdict === 'warning' ? 'var(--dg-warn)' : 'var(--dg-danger)'
    const app = appById(item.applicationId)
    return `<a href="#inspection/${item.id}" data-go="inspection" data-id="${item.id}"><circle cx="${coords[index][0]}" cy="${coords[index][1]}" r="5" fill="${color}" stroke="var(--dg-panel)" stroke-width="2"><title>${esc(app?.name || 'Service')} · ${item.readinessScore}</title></circle></a>`
  }).join('')
  const labels = points.map((item, index) => `<text x="${coords[index][0]}" y="${h - 6}" text-anchor="middle" font-size="10" fill="var(--dg-muted)">${new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>`).join('')
  return `<ul class="key"><li><i class="swatch"></i>Cleared</li><li><i class="swatch warn"></i>Review</li><li><i class="swatch danger"></i>Blocked</li></ul><svg viewBox="0 0 ${w} ${h}" width="100%" height="210" role="img" aria-label="Readiness of recent inspections, oldest to newest">${grid}${band}${guides}<path d="${area}" fill="var(--dg-ink)" opacity="0.08"/><path d="${line}" fill="none" stroke="var(--dg-ink)" stroke-opacity="0.72" stroke-width="2"/>${dots}${labels}</svg>`
}

function applications() {
  return page('Catalog', 'Applications', 'Every registered service stays on a recurring health and security inspect — daily, weekly, monthly, or yearly.', `<a class="btn" href="#register" data-go="register">Register application</a>`,
    `<section class="card"><div class="fleet-mobile list">${db.applications.map((app) => fleetMobile(app)).join('')}</div><table class="fleet-desk"><thead><tr><th>Application</th><th>Environment</th><th>Owner</th><th>Score</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${db.applications.map((app) => {
        const item = latest(app.id)
        return `<tr><td><a href="#application/${app.id}" data-go="application" data-id="${app.id}"><strong>${esc(app.name)}</strong></a><p class="small muted">${esc(app.stack)}</p></td><td class="muted">${esc(envLabel(app.environment))}</td><td class="muted">${esc(app.owner)}<span class="tiny" style="display:block">${esc(app.ownerEmail)}</span></td><td>${item ? scoreBar(item.readinessScore) : '<span class="small muted">—</span>'}</td><td>${due(app) ? '<span class="warn">Due now</span>' : when(app.nextInspectionAt)}<p class="tiny muted">${cadence(app.inspectionCadence)}</p></td><td>${badge(verdictOf(item))}</td><td><a class="btn secondary small" href="#application/${app.id}" data-go="application" data-id="${app.id}">Open</a> <a class="btn small" href="#inspect/${app.id}" data-go="inspect" data-id="${app.id}">Inspect</a> ${item ? `<a class="btn ghost small" href="#report/${item.id}" data-go="report" data-id="${item.id}">Report</a>` : ''}</td></tr>`
      }).join('')}
    </tbody></table></section>`)
}

function application() {
  const app = appById(state.id)
  if (!app) return `<p class="banner">Application not found.</p>`
  const history = db.inspections.filter((item) => item.applicationId === app.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const item = history[0]
  return `<div class="head"><div><p class="eyebrow">Registered service</p><h1>${esc(app.name)}</h1><p class="desc">${esc(app.owner)} · ${esc(app.ownerEmail)} · ${esc(envLabel(app.environment))} · ${esc(app.stack)}</p></div><a class="btn" href="#inspect/${app.id}" data-go="inspect" data-id="${app.id}">Run inspection</a></div>
    <div class="grid-2">
      <section class="card pad"><div class="row-top">${item ? ring(item.readinessScore, item.verdict) : ''}<div><p class="hint">Readiness</p><p>${item ? item.readinessScore + ' / 100' : 'No inspection yet.'}</p>${item ? `<p class="small muted">Health ${item.healthScore} · Security ${item.securityScore}</p>` : ''}<p style="margin-top:8px">${badge(verdictOf(item))}</p></div></div><p class="desc">${esc(item?.summary || 'Run the first production gate.')}</p></section>
      <section class="card pad"><h2>Schedule</h2><p class="desc">${cadence(app.inspectionCadence)} · ${app.scheduleEnabled ? (due(app) ? 'Due now' : when(app.nextInspectionAt)) : 'Paused'}</p><p class="small muted" style="margin-top:8px">${esc(app.healthUrl)}</p><p class="small muted">${esc(app.repoUrl)}</p><p class="desc">${esc(app.description)}</p></section>
    </div>
    <section class="card" style="margin-top:20px"><div class="card-h"><h2>Inspection history</h2></div><div class="list">${history.map((row) => `<a href="#inspection/${row.id}" data-go="inspection" data-id="${row.id}"><div class="row-top"><strong>${dateLabel(row.completedAt)}</strong>${badge(row.verdict)}</div><p class="small muted">Score ${row.readinessScore}</p></a>`).join('') || '<p class="pad muted">No inspections recorded.</p>'}</div></section>`
}

function register() {
  const hints = {
    daily: 'Re-check every registered health and security gate once a day.',
    weekly: 'Standard fleet review. Re-inspect every health and security gate each week.',
    monthly: 'Monthly control check to catch drift after releases.',
    yearly: 'Annual baseline. Use this only for low-change services.',
  }
  return `<div class="narrow">${page('Onboarding', 'Register application', 'Add a service to the release gate. Every registered health URL stays on a recurring inspect — not only at deploy time.', '',
    `<form class="card pad-lg reg-form" data-form="register">
      <label class="field"><span>Application name</span><input class="input" name="name" required placeholder="Billing API" /></label>
      <div class="split">
        <label class="field"><span>Owner</span><input class="input" name="owner" required placeholder="Release owner" /></label>
        <label class="field"><span>Owner email</span><input class="input" name="email" type="email" required placeholder="owner@company.com" /></label>
      </div>
      <p class="hint mail-note">After each inspection we mail this owner the score and whether the release is cleared, on hold, or blocked.</p>
      <label class="field"><span>Environment</span><select class="input" name="environment"><option value="qa">QA</option><option value="staging" selected>Staging</option><option value="production">Production</option></select></label>
      <label class="field"><span>Stack</span><select class="input" name="stack"><option>Node.js / Fastify</option><option>Node.js / NestJS</option><option>Go / gRPC</option><option>.NET / ASP.NET</option><option>Python / FastAPI</option><option>Java / Spring</option><option>React / Node</option></select></label>
      <label class="field"><span>Health endpoint</span><input class="input" name="healthUrl" required value="https://" /></label>
      <label class="field"><span>Repository</span><input class="input" name="repoUrl" value="https://github.com/" /></label>
      <label class="field"><span>Description</span><textarea class="input" name="description" rows="3"></textarea></label>
      <label class="field"><span>Recurring inspection</span><select class="input" name="cadence"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><p class="hint" data-cadence-hint>${hints.weekly}</p></label>
      <label class="check"><input type="checkbox" name="calendar" checked /><span><span class="check-title">Keep this service on the calendar</span><span class="hint">DeployGuard re-checks the registered health link on this cadence so security and health do not drift after the first deploy.</span></span></label>
      <label class="check"><input type="checkbox" name="uploads" /><span><span class="check-title">This application accepts file uploads</span><span class="hint">Uploads must stay in a secured folder, not a public path.</span></span></label>
      <p class="banner" hidden></p>
      <button class="btn" type="submit">Register and continue</button>
    </form>`)}</div>`
}

function inspect() {
  const app = appById(state.id)
  if (!app) return `<p class="banner">Application not found.</p>`
  const progress = Math.round(((state.inspectStep + 1) / STAGES.length) * 100)
  return page('Inspection', app.name, 'Simulated gate. This demo does not call the health URL.', '',
    `<section class="card pad"><p class="hint">${progress}%</p><div class="track"><span style="width:${progress}%;background:var(--dg-accent)"></span></div>
      ${STAGES.map(([label, detail], index) => `<div class="stage"><div class="dot ${index < state.inspectStep ? 'done' : index === state.inspectStep ? 'on' : ''}">${index < state.inspectStep ? '✓' : index + 1}</div><div><strong>${esc(label)}</strong><p class="small muted">${esc(detail)}</p></div></div>`).join('')}
    </section>`)
}

function inspection() {
  const item = db.inspections.find((row) => row.id === state.id)
  if (!item) return `<p class="banner">Inspection not found.</p>`
  const app = appById(item.applicationId)
  const failed = item.checks.filter((check) => check.severity !== 'pass')
  return page('Inspection', app?.name || 'Service', item.summary, `<a class="btn secondary" href="#report/${item.id}" data-go="report" data-id="${item.id}">Readiness report</a>`,
    `<div class="grid-2"><section class="card pad"><p class="hint">Readiness score</p><p style="font-size:28px">${item.readinessScore}<span class="muted"> / 100</span></p><p style="margin-top:8px">${badge(item.verdict)}</p><p class="small muted">Health ${item.healthScore} · Security ${item.securityScore}</p><p class="desc">${esc(item.aiAnalysis)}</p></section>
      <section class="card pad"><h2>Decision</h2><p class="desc">${item.verdict === 'block' ? 'I would not ship this yet.' : item.verdict === 'warning' ? 'I would not ship it until the warning is reviewed.' : 'I would ship it.'} A critical finding, or a score under 60, holds the release.</p></section></div>
    <section class="card" style="margin-top:20px"><div class="card-h"><h2>Gates</h2></div><table><thead><tr><th>Check</th><th>Category</th><th>Result</th></tr></thead><tbody>
      ${item.checks.map((check) => `<tr><td><strong>${esc(check.name)}</strong><p class="small muted">${esc(check.detail)}</p></td><td>${esc(check.category)}</td><td>${badge(check.severity === 'pass' ? 'pass' : check.severity === 'critical' ? 'critical' : 'warning', check.severity === 'pass' ? 'Pass' : check.severity === 'critical' ? 'Critical' : 'Warning')}</td></tr>`).join('')}
    </tbody></table></section>
    ${failed.length ? `<section class="card pad" style="margin-top:20px"><h2>What to fix</h2>${failed.map((check) => `<p style="margin-top:8px"><strong>${esc(check.name)}</strong> — ${esc(check.detail)}</p>`).join('')}</section>` : ''}`)
}

function report() {
  const item = db.inspections.find((row) => row.id === state.id)
  if (!item) return `<p class="banner">Report not found.</p>`
  const app = appById(item.applicationId)
  return page('Report', `${app?.name || 'Service'} readiness`, 'Local report. Nothing is downloaded from a server.', `<button class="btn secondary" onclick="window.print()">Print</button>`,
    `<section class="card pad"><p>Score ${item.readinessScore}. Decision ${verdictLabel(item.verdict)}.</p><p class="desc">${esc(item.summary)}</p><p class="hint">Health is 45 percent and security is 55. We round after the weighted sum.</p></section>`)
}

function tonyPage() {
  const examples = state.trained ? db.applications.length * 2 : 0
  return page('AI', 'Tony', 'Internal AI is on by default, same idea as Superblocks App AI: one org setting, no per-user keys. Tony trains on this workspace automatically.',
    `<button class="btn" data-action="train">${state.trained ? 'Retrain Tony' : 'Train Tony on latest data'}</button>`,
    `<div class="tony-stack">
      <div class="metrics">
        <section class="card pad"><p class="hint">Training status</p><p class="metric">${state.trained ? 'Current' : 'Not trained'}</p><p class="hint">${state.trained ? esc(dateLabel(state.trainedAt)) : 'Run train to build memory'}</p></section>
        <section class="card pad"><p class="hint">Examples</p><p class="metric">${examples}</p><p class="hint">Workspace seed cards</p></section>
        <section class="card pad"><p class="hint">Source records</p><p class="metric">${db.applications.length} apps · ${db.inspections.length} inspections</p><p class="hint">Scores, gates, dependencies, advisor decisions</p></section>
      </div>
      ${state.message ? `<p class="note">${esc(state.message)}</p>` : ''}
      <section class="card pad-lg"><h2>AI connection</h2><div class="ai-copy"><p><span class="pill">Internal AI</span> Workspace mode. Tony answers from inspections until a server key is set.</p><p>Auto-selected for this workspace. Add <span class="mono">TONY_API_KEY</span> to <span class="mono">.env</span> and restart the dev server when you want the model to compile training. Until then Tony uses DeployGuard data only — no browser API key.</p><p>Model in use: gpt-4o-mini</p></div></section>
      <section class="card pad-lg"><h2>Voice sample</h2><p class="hint">ElevenLabs will speak with the saved voice. Model eleven_multilingual_v2.</p>
        <form data-form="voice"><label class="field"><span>Sentence</span><input class="input" name="sentence" value="${esc(state.sample)}" placeholder="Type a sentence for Tony to speak" /></label><button class="btn secondary" type="submit" ${state.voiceBusy ? 'disabled' : ''}>${state.voiceBusy ? 'Generating voice…' : 'Play voice'}</button></form>
        ${state.sampleError ? `<p class="banner" style="margin-top:12px">${esc(state.sampleError)}</p>` : ''}</section>
      ${tonyLog('page')}
    </div>`)
}

function tonyDock() {
  if (!state.tonyOpen) return `<div class="dock"><button class="dock-btn" data-action="tony-open"><span class="dock-mark">T</span> Tony</button></div>`
  return `<section class="tony" aria-label="Tony">${tonyHead(false)}<div class="log">${tonyMessages()}</div>${tonyForm()}</section>`
}
function tonyHead(page) {
  return `<header><div><strong>Tony</strong><p class="hint">Release desk</p></div><div class="tony-actions"><button class="linkish" data-action="mute" aria-pressed="${state.voiceOn}" aria-label="${state.voiceOn ? 'Mute Tony' : 'Unmute Tony'}">${state.voiceOn ? 'Mute' : 'Unmute'}</button><button class="linkish" data-action="clear">Clear</button>${page ? '' : '<button class="linkish" data-action="tony-close">Close</button>'}</div></header>`
}
function tonyLog(variant) {
  const page = variant === 'page'
  return `<section class="${page ? 'card tony-page' : 'tony'}">${tonyHead(page)}<div class="log">${tonyMessages()}</div>${tonyForm()}</section>`
}
function tonyMessages() {
  const thread = state.tony.length ? state.tony : [{ role: 'tony', text: "Hey, I'm Tony. Ask me about a service and I'll tell you if I'd ship it.", sources: [] }]
  const rows = thread.map((item) => {
    const sources = (item.sources || []).map((source, index) => `${index ? ', ' : ''}${source.href ? `<a class="accent" href="#${esc(source.href)}" data-go="${esc(source.view)}" data-id="${esc(source.id)}">${esc(source.label)}</a>` : esc(source.label)}`).join('')
    const mine = item.role === 'user'
    return `<article class="msg ${mine ? 'from-user' : 'from-tony'}"><p class="who-label">${mine ? 'You' : 'Tony'}</p><p class="bubble ${mine ? 'user' : 'desk'}">${esc(item.text)}</p>${sources ? `<p class="sources">From ${sources}</p>` : ''}</article>`
  }).join('')
  const alert = state.voiceError ? `<p class="banner">${esc(state.voiceError)}</p>` : ''
  return alert + rows
}
function tonyForm() {
  return `<form data-form="tony"><input class="input" name="q" placeholder="Ask about a service or a release" /><button class="btn" type="submit" style="width:100%;margin-top:8px" disabled>Send</button></form>`
}
function askTony(question) {
  const q = question.toLowerCase()
  const ranked = [...db.applications].sort((a, b) => (latest(a.id)?.readinessScore ?? 101) - (latest(b.id)?.readinessScore ?? 101))
  const weakest = ranked[0]
  const named = db.applications.find((app) => q.includes(app.name.toLowerCase()))
  const target = named || weakest
  const item = latest(target.id)
  const failed = item?.checks.find((check) => check.severity !== 'pass')
  const sources = [{ label: target.name, view: 'application', id: target.id, href: `application/${target.id}` }]
  if (item) sources.push({ label: 'Latest inspection', view: 'inspection', id: item.id, href: `inspection/${item.id}` })
  let text = `${target.name} is at ${item?.readinessScore ?? '—'}. I'd ship it.`
  if (q.includes('what should') || q.includes('start')) {
    const gate = latest(weakest.id)?.checks.find((check) => check.severity !== 'pass')
    text = `I'd start with ${weakest.name}. It's at ${latest(weakest.id)?.readinessScore}, and the first thing I'd fix is ${gate?.name || 'the open gate'}.`
  } else if (!item) text = `${target.name} has no inspection yet.`
  else if (item.verdict === 'block') text = `${target.name} is at ${item.readinessScore}. I wouldn't ship it yet — I'd fix ${failed?.name || 'the failed gate'} first.`
  else if (item.verdict === 'warning') text = `${target.name} is at ${item.readinessScore}. I wouldn't ship it until ${failed?.name || 'the warning'} is reviewed.`
  return { text, sources }
}

function access() {
  const pending = db.users.filter((user) => user.status === 'pending')
  const directory = db.users.filter((user) => user.status !== 'pending')
  const form = state.addForm
  const edit = state.editForm
  return `<div class="access">
    <div class="head">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>Access</h1>
        <p class="desc">Add users, edit details, delete accounts, and decide pending requests. Passwords cannot be edited.</p>
        ${state.message ? `<p class="note">${esc(state.message)}</p>` : ''}
      </div>
      <div class="actions"><button class="btn" type="button" data-action="add-user">${state.showAdd ? 'Close' : 'Add user'}</button></div>
    </div>
    ${state.showAdd ? `<form class="card pad-lg access-form" data-form="add-user">
      <h2>Add user</h2>
      <p class="hint">Set an initial password. After create, only details can be edited.</p>
      <div class="access-grid">
        <label class="field"><span>Full name</span><input class="input" name="name" required value="${esc(form.name)}" /></label>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" required value="${esc(form.email)}" /></label>
        <label class="field"><span>Username</span><input class="input" name="username" required value="${esc(form.username)}" /></label>
        <label class="field"><span>Role</span><select class="input" name="role">${roleOptions(form.role)}</select></label>
        <label class="field"><span>Status</span><select class="input" name="status">${statusOptions(form.status)}</select></label>
        <label class="field"><span>Initial password</span>
          <span class="secret">
            <input class="input" name="password" type="${state.showPassword ? 'text' : 'password'}" autocomplete="new-password" required value="${esc(form.password)}" />
            <button class="show" type="button" data-action="toggle-password" aria-pressed="${state.showPassword}" aria-label="${state.showPassword ? 'Hide password' : 'Show password'}">${state.showPassword ? 'Hide' : 'Show'}</button>
          </span>
          <button class="gen" type="button" data-action="generate">Generate password</button>
        </label>
        <div class="span-2">
          <label class="field"><span>Note</span><input class="input" name="reason" value="${esc(form.reason)}" /></label>
          ${ruleList(form.password)}
        </div>
      </div>
      <button class="btn" type="submit">Save user</button>
    </form>` : ''}
    <section class="card">
      <div class="card-h"><h2>Pending requests</h2></div>
      ${pending.length ? pending.map((user) => `<div class="pending-row">
        <div>
          <p class="person">${esc(user.name)}</p>
          <p class="small muted">${esc(user.email)} · @${esc(user.username)} · asked ${esc(askedOn(user.createdAt))}</p>
          <p class="reason">${esc(user.reason)}</p>
        </div>
        <div class="row-actions">
          <select class="input compact" data-grant="${user.id}" aria-label="Role for ${esc(user.name)}">${roleOptions(state.grantRoles[user.id] || user.role)}</select>
          <button class="btn small" type="button" data-decide="active" data-id="${user.id}">Provide access</button>
          <button class="btn small danger-line" type="button" data-decide="denied" data-id="${user.id}">Deny</button>
          <button class="btn small line" type="button" data-action="edit-user" data-id="${user.id}">Edit</button>
          <button class="btn small line trash" type="button" data-action="delete-user" data-id="${user.id}">Delete</button>
        </div>
      </div>`).join('') : '<p class="empty">No open requests.</p>'}
    </section>
    ${edit ? `<form class="card pad-lg access-form edit-card" data-form="edit-user">
      <h2>Edit details</h2>
      <p class="hint">Name, email, username, role, status, and note. Password is locked.</p>
      <div class="access-grid">
        <label class="field"><span>Full name</span><input class="input" name="name" required value="${esc(edit.name)}" /></label>
        <label class="field"><span>Email</span><input class="input" name="email" type="email" required value="${esc(edit.email)}" /></label>
        <label class="field"><span>Username</span><input class="input" name="username" required value="${esc(edit.username)}" /></label>
        <label class="field"><span>Role</span><select class="input" name="role">${roleOptions(edit.role)}</select></label>
        <label class="field"><span>Status</span><select class="input" name="status">${statusOptions(edit.status)}</select></label>
        <label class="field"><span>Note</span><input class="input" name="reason" value="${esc(edit.reason)}" /></label>
        <p class="locked span-2">Password is not shown and cannot be changed from Access.</p>
      </div>
      <div class="form-actions">
        <button class="btn" type="submit">Save details</button>
        <button class="btn line" type="button" data-action="cancel-edit">Cancel</button>
      </div>
    </form>` : ''}
    <section class="card">
      <div class="card-h"><h2>Users</h2></div>
      <div class="table-wrap"><table class="users"><thead><tr><th>Name</th><th>Email / username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${directory.map((user) => `<tr>
          <td class="person">${esc(user.name)}</td>
          <td class="small muted">${esc(user.email)}<span class="block">@${esc(user.username)}</span></td>
          <td>${esc(roleLabel(user.role))}</td>
          <td class="status">${esc(user.status)}</td>
          <td><div class="row-actions">
            <button class="btn small line" type="button" data-action="edit-user" data-id="${user.id}">Edit</button>
            <button class="btn small line trash" type="button" data-action="delete-user" data-id="${user.id}" ${user.id === 'u_admin' ? 'disabled' : ''}>Delete</button>
          </div></td>
        </tr>`).join('')}
      </tbody></table></div>
    </section>
  </div>`
}

function applyTheme(pref) {
  state.theme = pref
  localStorage.setItem(THEME_KEY, pref)
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = pref === 'system' ? (dark ? 'dark' : 'light') : pref
  document.documentElement.setAttribute('data-theme', theme)
}

function render() {
  const root = document.getElementById('app')
  root.innerHTML = state.authed ? shell(({
    dashboard, applications, application, register, inspect, inspection, report, tony: tonyPage, access,
  })[state.view]?.() || dashboard()) : login()
}

function readHash() {
  const [view, id] = location.hash.replace('#', '').split('/')
  if (['dashboard', 'applications', 'application', 'register', 'inspect', 'inspection', 'report', 'tony', 'access'].includes(view)) {
    state.view = view
    state.id = id || null
  }
}

let inspectTimer = 0
function runInspect() {
  window.clearInterval(inspectTimer)
  const app = appById(state.id)
  if (!app) return
  inspectTimer = window.setInterval(() => {
    if (state.view !== 'inspect') return window.clearInterval(inspectTimer)
    if (state.inspectStep < STAGES.length - 1) {
      state.inspectStep += 1
      render()
      return
    }
    window.clearInterval(inspectTimer)
    const http = app.healthUrl.startsWith('http://')
    const health = http ? 48 : 86
    const security = http ? 32 : 84
    const readiness = Math.round(health * 0.45 + security * 0.55)
    const fails = http ? [{ gate: 'https', severity: 'critical', detail: 'The inspected endpoint is HTTP.' }] : []
    const checks = GATES.map(([gate, category, name]) => {
      const hit = fails.find((item) => item.gate === gate)
      return hit ? { id: gate, gate, category, name, severity: hit.severity, detail: hit.detail, scoreImpact: 25 } : { id: gate, gate, category, name, severity: 'pass', detail: `${name} passed in this demo run.`, scoreImpact: 0 }
    })
    const id = `insp_${Date.now()}`
    const verdict = http || readiness < 60 ? 'block' : readiness < 80 ? 'warning' : 'deploy'
    db.inspections.push({ id, applicationId: app.id, startedAt: db.now, completedAt: new Date().toISOString(), trigger: 'manual', healthScore: health, securityScore: security, readinessScore: readiness, verdict, summary: `${app.name} ${verdictLabel(verdict).toLowerCase()} at ${readiness}.`, aiAnalysis: http ? `On ${app.name}, HTTPS failed. The inspected endpoint is HTTP.` : `${app.name} is at ${readiness}. I'd ship it.`, checks })
    go('inspection', id)
  }, 700)
}

document.getElementById('app').addEventListener('click', (event) => {
  syncAccessDrafts()
  const goLink = event.target.closest('[data-go]')
  if (goLink) {
    event.preventDefault()
    go(goLink.dataset.go, goLink.dataset.id)
    return
  }
  const decide = event.target.closest('[data-decide]')
  if (decide) {
    const user = db.users.find((item) => item.id === decide.dataset.id)
    if (user) {
      const role = decide.closest('.pending-row')?.querySelector('select')?.value
      if (role) user.role = role
      user.status = decide.dataset.decide
      state.message = decide.dataset.decide === 'active' ? 'Access provided.' : 'Access denied.'
    }
    render()
    return
  }
  const href = event.target.closest('[data-href]')
  if (href) {
    const [kind, id] = href.dataset.href.split(':')
    go(kind === 'inspection' ? 'inspection' : 'dashboard', id)
    return
  }
  const theme = event.target.closest('button[data-theme]')
  if (theme) { applyTheme(theme.dataset.theme); state.menu = null; render(); return }
  const action = event.target.closest('[data-action]')
  if (!action) return
  const name = action.dataset.action
  if (name === 'logout') { state.authed = false; state.menu = null; render(); return }
  if (name === 'notices') state.menu = state.menu === 'notices' ? null : 'notices'
  if (name === 'account') state.menu = state.menu === 'account' ? null : 'account'
  if (name === 'theme') state.menu = state.menu === 'theme' ? null : 'theme'
  if (name === 'sheet') state.sheet = !state.sheet
  if (name === 'tony-open') state.tonyOpen = true
  if (name === 'tony-close') state.tonyOpen = false
  if (name === 'mute') state.voiceOn = !state.voiceOn
  if (name === 'clear') state.tony = []
  if (name === 'refresh') state.message = 'Demo data is already local. Nothing was fetched.'
  if (name === 'due') state.message = metrics().due ? `${metrics().due} inspections are due. Open a service and run Inspect.` : 'No inspections are due.'
  if (name === 'train') {
    state.trained = true
    state.trainedAt = new Date().toISOString()
    state.message = `Training pack built from ${db.applications.length * 2} workspace examples. Add an API key and train again to compile them with the AI model.`
  }
  if (name === 'add-user') {
    state.showAdd = !state.showAdd
    state.showPassword = false
  }
  if (name === 'toggle-password') state.showPassword = !state.showPassword
  if (name === 'generate') {
    state.showPassword = true
    state.addForm.password = `Harbor${Math.floor(Math.random() * 90 + 10)}line!`
  }
  if (name === 'edit-user') {
    const user = db.users.find((item) => item.id === action.dataset.id)
    if (user) {
      state.editingId = user.id
      state.editForm = { name: user.name, email: user.email, username: user.username, role: user.role, status: user.status, reason: user.reason || '' }
    }
  }
  if (name === 'cancel-edit') {
    state.editingId = null
    state.editForm = null
  }
  if (name === 'delete-user') {
    const user = db.users.find((item) => item.id === action.dataset.id)
    if (!user || user.id === 'u_admin') { render(); return }
    if (!window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return
    db.users = db.users.filter((item) => item.id !== user.id)
    if (state.editingId === user.id) {
      state.editingId = null
      state.editForm = null
    }
    state.message = 'User deleted.'
  }
  if (name === 'cycle-theme') applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  render()
})

document.getElementById('app').addEventListener('change', (event) => {
  const grant = event.target.closest('select[data-grant]')
  if (grant) state.grantRoles[grant.dataset.grant] = grant.value
  const select = event.target.closest('select[name="cadence"]')
  if (!select) return
  const hints = {
    daily: 'Re-check every registered health and security gate once a day.',
    weekly: 'Standard fleet review. Re-inspect every health and security gate each week.',
    monthly: 'Monthly control check to catch drift after releases.',
    yearly: 'Annual baseline. Use this only for low-change services.',
  }
  const hint = select.parentElement.querySelector('[data-cadence-hint]')
  if (hint) hint.textContent = hints[select.value] || ''
})

document.getElementById('app').addEventListener('input', (event) => {
  const tony = event.target.closest('form[data-form="tony"]')
  if (tony) {
    const button = tony.querySelector('button')
    if (button) button.disabled = !String(event.target.value || '').trim()
  }
  const add = event.target.closest('form[data-form="add-user"]')
  if (add && event.target.name === 'password') {
    state.addForm.password = event.target.value
    paintRules(add, event.target.value)
  }
})

document.getElementById('app').addEventListener('submit', (event) => {
  const form = event.target.closest('form')
  if (!form) return
  event.preventDefault()
  const data = new FormData(form)
  if (form.dataset.form === 'login') {
    state.authed = true
    const [view, id] = location.hash.replace('#', '').split('/')
    go(view || 'dashboard', id)
    return
  }
  if (form.dataset.form === 'register') {
    const email = String(data.get('email') || '')
    if (!email.includes('@')) {
      const banner = form.querySelector('.banner')
      if (banner) {
        banner.hidden = false
        banner.textContent = 'Enter a valid owner email. Inspection results are mailed to this address.'
      }
      return
    }
    const id = `app_${Date.now()}`
    db.applications.push({ id, name: String(data.get('name')), owner: String(data.get('owner')), ownerEmail: email, environment: String(data.get('environment')), stack: String(data.get('stack')), healthUrl: String(data.get('healthUrl')), repoUrl: String(data.get('repoUrl') || ''), description: String(data.get('description') || ''), hasFileUploader: data.get('uploads') === 'on', registeredAt: new Date().toISOString(), inspectionCadence: String(data.get('cadence') || 'weekly'), scheduleEnabled: data.get('calendar') === 'on', nextInspectionAt: '2026-10-10T09:00:00.000Z' })
    go('application', id)
    return
  }
  if (form.dataset.form === 'tony') {
    const text = String(data.get('q') || '').trim()
    if (!text) return
    const answer = askTony(text)
    state.tony.push({ role: 'user', text, sources: [] }, { role: 'tony', text: answer.text, sources: answer.sources })
    state.voiceError = state.voiceOn ? 'This demo does not call a voice provider.' : null
    render()
    return
  }
  if (form.dataset.form === 'voice') {
    state.sample = String(data.get('sentence') || '')
    state.voiceBusy = true
    state.sampleError = null
    render()
    window.setTimeout(() => { state.voiceBusy = false; state.sampleError = 'This demo does not call a voice provider.'; render() }, 400)
    return
  }
  if (form.dataset.form === 'add-user') {
    const email = String(data.get('email') || '').trim()
    const username = String(data.get('username') || '').trim()
    const password = String(data.get('password') || '')
    const issues = passwordIssues(password)
    if (issues.length) {
      state.addForm = { name: String(data.get('name') || ''), email, username, role: String(data.get('role') || 'developer'), status: String(data.get('status') || 'active'), reason: String(data.get('reason') || ''), password }
      state.message = `Initial password is not strong enough: ${issues.join(', ')}.`
      render()
      return
    }
    if (db.users.some((item) => item.email.toLowerCase() === email.toLowerCase() || item.username.toLowerCase() === username.toLowerCase())) {
      state.message = 'An account with this email or username already exists.'
      render()
      return
    }
    db.users.push({ id: `u_${Date.now()}`, name: String(data.get('name') || '').trim(), email, username, role: String(data.get('role') || 'developer'), status: String(data.get('status') || 'active'), reason: String(data.get('reason') || '').trim() || 'Added by admin', createdAt: new Date().toISOString() })
    state.addForm = emptyAdd()
    state.showAdd = false
    state.showPassword = false
    state.message = 'User added. Password was stored as a hash and cannot be viewed or edited here.'
    render()
    return
  }
  if (form.dataset.form === 'edit-user') {
    const user = db.users.find((item) => item.id === state.editingId)
    if (!user) return
    const email = String(data.get('email') || '').trim()
    const username = String(data.get('username') || '').trim()
    if (db.users.some((item) => item.id !== user.id && (item.email.toLowerCase() === email.toLowerCase() || item.username.toLowerCase() === username.toLowerCase()))) {
      state.editForm = { name: String(data.get('name') || ''), email, username, role: String(data.get('role') || user.role), status: String(data.get('status') || user.status), reason: String(data.get('reason') || '') }
      state.message = 'An account with this email or username already exists.'
      render()
      return
    }
    user.name = String(data.get('name') || '').trim()
    user.email = email
    user.username = username
    user.role = String(data.get('role') || user.role)
    user.status = String(data.get('status') || user.status)
    user.reason = String(data.get('reason') || '')
    state.editingId = null
    state.editForm = null
    state.message = 'User details updated. Password was not changed.'
    render()
  }
})

const preview = new URLSearchParams(location.search).get('preview') === '1'
if (preview) state.authed = true
applyTheme(preview ? 'dark' : (localStorage.getItem(THEME_KEY) || 'system'))
readHash()
window.addEventListener('hashchange', () => { if (state.authed) { readHash(); render() } })
render()
