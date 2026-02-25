# Deployment & CI Documentation

## Strategy Overview

Our architecture utilizes a PaaS-Driven model where all deployment processes are handled automatically with no manual intervention necessary on bare-metal servers. 

### CI/CD Pipeline (GitHub Actions)

We enforce branch protection on `main`. Each Pull Request natively triggers a sequential CI pipeline validation:

1. **Setup & Cache**: Node `18` is provisioned alongside `npm ci` module caching to dramatically speed up runtimes.
2. **Lint Validation**: Eslint strictly validates syntax, ensuring logic is clean and standardized across modules. 
3. **Security Analysis (npm audit)**: The pipeline actively scans for severe or critical NPM vulnerabilities. Should the tree contain hazardous unpatched dependencies, the check fails.
4. **Build Processing**: 
   - *Backend*: Validates Docker container building logic locally to preempt failures. 
   - *Frontend*: Runs `npm run build` using Next.js to ensure output generation works end-to-end.

Zero changes traverse into the pipeline for production delivery unless the entire validation stack returns green.

### Delivery Lifecycle

**Backend Application (Render)**
- Configured specifically to hook into GitHub. Whenever the `main` branch observes code change (via successful PR merge), the backend server kicks off a fresh `Docker build`.
- Environment constraints and secrets are loaded gracefully through the Render Dashboard at compile and boot times.
- Availability is monitored dynamically via a `GET /health` endpoint check run every five minutes. 

**Frontend Application (Vercel)**
- Auto-syncs to `main` and detects structural shifts natively without overhead.
- Validates the local cache build, overrides and updates the production UI with instant rollout deployment routing.
- If an erroneous push is detected in production post-deployment, straightforward 1-click dash rollbacks exist.

### Security Addendum
- Hardcoded sensitive values in files stringently violate PR policy. 
- GitHub actions pulls from encrypted GitHub `.env` Secrets. 
- Strict runtime `.dockerignore` policies isolate tests and modules, compressing our runtime layer size directly affecting boot scaling overhead.
