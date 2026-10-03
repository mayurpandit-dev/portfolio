# DeployGuard demo UI

A static copy of the DeployGuard readiness gate for a portfolio walkthrough. It uses the same screens as the app: sign in, dashboard, applications, register, inspect, inspection, Tony, and access.

It does not call the DeployGuard API, the database, or a voice provider. Sign-in, register, inspect, and access changes stay in the browser tab.

## Run

From the repository root:

```bash
npx --yes serve demo-ui -l 4177
```

Open http://localhost:4177

You can also open `demo-ui/index.html` in a browser.

## Dummy data

`demo-data.js` holds the sample fleet: Checkout API, Payments Gateway, Identity Service, Inventory Worker, Notifications Hub, Analytics Pipeline, and Admin Portal. Scores use the product rule, round(health × 0.45 + security × 0.55). A critical finding, or a score under 60, is blocked.

Theme choice is stored as `deployguard.demo.theme`, separate from the real app.

## Navigate

Sign in with any password. The header matches the product: Dashboard, Applications, Register, Tony, Access. Open a service, run a simulated inspection, or ask Tony about a service. Tony’s voice button explains that this demo does not speak.
