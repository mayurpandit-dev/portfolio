/* Fixture only. No network. Mirrors the product sample fleet. */
const DEMO = {
  now: '2026-10-03T08:00:00.000Z',
  operator: { name: 'Demo Operator', email: 'operator@demo.example', role: 'admin', username: 'demo' },
  users: [
    { id: 'u_admin', name: 'Demo Operator', email: 'operator@demo.example', username: 'demo', role: 'admin', status: 'active', reason: 'Demo admin', createdAt: '2026-08-01T09:00:00.000Z' },
    { id: 'u_dev', name: 'Maya Chen', email: 'maya@demo.example', username: 'maya', role: 'developer', status: 'active', reason: 'Checkout owner', createdAt: '2026-08-12T09:15:00.000Z' },
    { id: 'u_sec', name: 'Priya Nair', email: 'priya@demo.example', username: 'priya', role: 'security', status: 'active', reason: 'Identity review', createdAt: '2026-08-08T16:05:00.000Z' },
    { id: 'u_pending', name: 'Luis Ortega', email: 'luis@demo.example', username: 'luis', role: 'platform', status: 'pending', reason: 'Needs access to Inventory Worker', createdAt: '2026-10-02T11:20:00.000Z' },
  ],
  notices: [
    { id: 'n1', title: 'Release held', body: 'Admin Portal came back blocked. Score 24/100.', href: 'inspection:insp_admin' },
    { id: 'n2', title: 'Inspection finished', body: 'Checkout API finished inspection at 62/100.', href: 'inspection:insp_checkout' },
  ],
  applications: [
    { id: 'app_checkout', name: 'Checkout API', owner: 'Maya Chen', ownerEmail: 'maya@demo.example', environment: 'production', stack: 'Node.js / Fastify', healthUrl: 'https://checkout.shop.internal/health', repoUrl: 'https://github.com/acme/checkout-api', description: 'Cart, tax, and order placement service for the storefront.', hasFileUploader: false, registeredAt: '2026-08-12T09:15:00.000Z', inspectionCadence: 'weekly', scheduleEnabled: true, nextInspectionAt: '2026-10-06T09:15:00.000Z' },
    { id: 'app_payments', name: 'Payments Gateway', owner: 'Owen Blake', ownerEmail: 'owen@demo.example', environment: 'production', stack: 'Go / gRPC', healthUrl: 'https://pay.shop.internal/ready', repoUrl: 'https://github.com/acme/payments-gateway', description: 'Card authorization and settlement adapter.', hasFileUploader: false, registeredAt: '2026-08-14T11:40:00.000Z', inspectionCadence: 'weekly', scheduleEnabled: true, nextInspectionAt: '2026-10-02T11:40:00.000Z' },
    { id: 'app_identity', name: 'Identity Service', owner: 'Priya Nair', ownerEmail: 'priya@demo.example', environment: 'production', stack: '.NET / ASP.NET', healthUrl: 'http://id.corp.internal/health', repoUrl: 'https://github.com/acme/identity-service', description: 'SSO, session issuance, and token introspection.', hasFileUploader: false, registeredAt: '2026-08-08T16:05:00.000Z', inspectionCadence: 'daily', scheduleEnabled: true, nextInspectionAt: '2026-10-03T06:00:00.000Z' },
    { id: 'app_inventory', name: 'Inventory Worker', owner: 'Luis Ortega', ownerEmail: 'luis@demo.example', environment: 'staging', stack: 'Python / FastAPI', healthUrl: 'https://inventory.stage.internal/live', repoUrl: 'https://github.com/acme/inventory-worker', description: 'Stock reservation consumer and warehouse sync.', hasFileUploader: false, registeredAt: '2026-08-18T08:22:00.000Z', inspectionCadence: 'monthly', scheduleEnabled: true, nextInspectionAt: '2026-10-18T08:22:00.000Z' },
    { id: 'app_notify', name: 'Notifications Hub', owner: 'Ava Romano', ownerEmail: 'ava@demo.example', environment: 'production', stack: 'Node.js / NestJS', healthUrl: 'https://notify.shop.internal/health', repoUrl: 'https://github.com/acme/notifications-hub', description: 'Email, SMS, and push orchestration.', hasFileUploader: true, registeredAt: '2026-08-16T13:10:00.000Z', inspectionCadence: 'weekly', scheduleEnabled: true, nextInspectionAt: '2026-10-08T13:10:00.000Z' },
    { id: 'app_analytics', name: 'Analytics Pipeline', owner: 'Kenji Sato', ownerEmail: 'kenji@demo.example', environment: 'qa', stack: 'Java / Spring', healthUrl: 'https://analytics.qa.internal/actuator/health', repoUrl: 'https://github.com/acme/analytics-pipeline', description: 'Event ingest and warehouse loaders.', hasFileUploader: false, registeredAt: '2026-08-10T19:48:00.000Z', inspectionCadence: 'yearly', scheduleEnabled: true, nextInspectionAt: '2027-08-10T19:48:00.000Z' },
    { id: 'app_admin', name: 'Admin Portal', owner: 'Sofia Mendes', ownerEmail: 'sofia@demo.example', environment: 'staging', stack: 'React / Node', healthUrl: 'http://admin.stage.internal/status', repoUrl: 'https://github.com/acme/admin-portal', description: 'Internal operations console for support and finance. Accepts document uploads.', hasFileUploader: true, registeredAt: '2026-08-19T07:33:00.000Z', inspectionCadence: 'daily', scheduleEnabled: true, nextInspectionAt: '2026-10-03T07:00:00.000Z' },
  ],
  inspections: [],
}

const GATES = [
  ['application-health', 'health', 'Application health'],
  ['response-time', 'health', 'Response time'],
  ['https', 'security', 'HTTPS'],
  ['authentication', 'security', 'Authentication'],
  ['authorization', 'security', 'Authorization'],
  ['session-cookies', 'security', 'Session cookies'],
  ['cors', 'security', 'CORS'],
  ['hsts', 'security', 'HSTS'],
  ['content-type-options', 'security', 'Content type options'],
  ['frame-protection', 'security', 'Frame protection'],
  ['content-security-policy', 'security', 'Content security policy'],
  ['rate-limiting', 'security', 'Rate limiting'],
  ['debug-exposure', 'security', 'Debug exposure'],
  ['environment-variables', 'security', 'Environment variables'],
  ['database', 'security', 'Database'],
  ['error-handling', 'health', 'Error handling'],
  ['dependencies', 'security', 'Dependencies'],
  ['file-uploads', 'security', 'File uploads'],
  ['audit-logs', 'security', 'Audit logs'],
]

function check(gate, category, name, severity, detail) {
  return { id: gate, gate, category, name, severity, detail, scoreImpact: severity === 'pass' ? 0 : severity === 'critical' ? 25 : 8 }
}

function buildChecks(fails) {
  return GATES.map(([gate, category, name]) => {
    const hit = fails.find((item) => item.gate === gate)
    if (!hit) return check(gate, category, name, 'pass', `${name} passed in this fixture.`)
    return check(gate, category, name, hit.severity, hit.detail)
  })
}

function pack(id, appId, when, health, security, fails, summary) {
  const readiness = Math.round(health * 0.45 + security * 0.55)
  const checks = buildChecks(fails)
  const critical = checks.some((item) => item.severity === 'critical')
  const verdict = critical || readiness < 60 ? 'block' : readiness < 80 ? 'warning' : 'deploy'
  return {
    id, applicationId: appId, startedAt: when, completedAt: when, trigger: 'manual',
    healthScore: health, securityScore: security, readinessScore: readiness, verdict, summary,
    aiAnalysis: summary, checks,
  }
}

DEMO.inspections = [
  pack('insp_checkout', 'app_checkout', '2026-10-02T14:12:00.000Z', 78, 49, [
    { gate: 'session-cookies', severity: 'warning', detail: 'The session cookie is missing SameSite.' },
  ], 'Checkout API needs review. I would fix Session cookies first.'),
  pack('insp_payments', 'app_payments', '2026-10-01T11:40:00.000Z', 80, 66, [
    { gate: 'response-time', severity: 'warning', detail: 'p95 latency is above the release budget.' },
  ], 'Payments Gateway needs review. The first thing I would fix is response time.'),
  pack('insp_identity', 'app_identity', '2026-10-03T06:10:00.000Z', 55, 30, [
    { gate: 'https', severity: 'critical', detail: 'The inspected endpoint is HTTP.' },
  ], 'Identity Service is blocked. I would not ship it until HTTPS is fixed.'),
  pack('insp_inventory', 'app_inventory', '2026-09-18T08:22:00.000Z', 90, 80, [], 'Inventory Worker cleared the gate.'),
  pack('insp_notify', 'app_notify', '2026-10-01T13:10:00.000Z', 84, 70, [
    { gate: 'content-security-policy', severity: 'warning', detail: 'No Content-Security-Policy on the response.' },
  ], 'Notifications Hub needs review. I would add a Content-Security-Policy.'),
  pack('insp_analytics', 'app_analytics', '2026-08-21T12:00:00.000Z', 92, 90, [], 'Analytics Pipeline cleared the gate.'),
  pack('insp_admin', 'app_admin', '2026-10-03T07:05:00.000Z', 40, 11, [
    { gate: 'https', severity: 'critical', detail: 'The inspected endpoint is HTTP.' },
    { gate: 'authentication', severity: 'critical', detail: 'An admin route answers without a session.' },
  ], 'Admin Portal is blocked. I would not ship it yet.'),
]

window.DEMO = DEMO
window.GATES = GATES
