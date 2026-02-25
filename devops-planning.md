# DevOps Sprint 2 – Planning & Commit Strategy

## 1. Architecture Overview
**Deployment Model:** PaaS-Driven Infrastructure (No Server Management)
- **Frontend:** Hosted on Vercel (https://se-frontend-sage.vercel.app/)
- **Backend:** Hosted on Render (https://se-backend-b7mk.onrender.com)
- **Containerization:** Docker (Backend only)
- **Core Principle:** Maximum reliability with minimum hassle.
- **Constraints Maintained:** No Kubernetes, Terraform, AWS EC2, ELK, Prometheus, or chaos engineering.

---

## 2. CI Pipeline Breakdown
**Platform:** GitHub Actions
**Trigger Events:** Pull Requests against `main` and direct pushes to `main`.
**Pipeline Stages (Strictly Sequential):**
1. **Environment Setup:** Download code, setup Node.js, and install NPM packages.
2. **Security Checks:** Run `npm audit` to check for security vulnerabilities in both frontend and backend packages.
3. **Lint & Formatting:** Run `eslint` to check for bad code practices.
4. **Build Verification:** Make sure `npm run build` actually works for the frontend so Vercel doesn't break.
5. **Docker Validation:** Try building the `se-backend` Docker image to make sure it functions properly.
*(Note: Automated testing stages will be integrated in a future phase once test files are available).*

---

## 3. Workflow Enforcement Logic (Pre-Testing)
**Target Scope:** Global Project Health
**Rules of Discipline:**
- **Hard Gates:** Nobody can merge into `main` if the basic checks fail.
- **What fails the pipeline?** 
  - An annoying linter error or badly formatted code.
  - The frontend build process crashing.
  - The backend Docker image failing to build.
- Deployments only happen if the `main` branch has a green checkmark.

---

## 4. Docker Integration Strategy (Backend)
- A highly optimized `Dockerfile` in `se-backend/`.
- Uses multi-stage builds and a lightweight base image (like `node:18-alpine`).
- Includes a `.dockerignore` file so we don't accidentally copy `node_modules` into the final image.
- **CI Role:** GitHub Actions runs `docker build` every time someone makes a PR. This makes sure Render deployments won't randomly fail after merging.

---

## 5. Deployment Lifecycle & Gating Strategy
1. **Development:** Engineers write code on a branch and open a Pull Request.
2. **CI Interception:** GitHub Actions automatically runs Security, Lint, and Docker validation workflows.
3. **Approval & Merge:** After the CI is green and someone reviews the code, it gets merged to `main`.
4. **Delivery:**
   - **Frontend:** Vercel automatically deploys it. Vercel knows to wait and ignore the build if GitHub CI checks are failing.
   - **Backend:** Render automatically deploys when `main` gets updated.
5. **Post-Deploy Validation:** Render constantly checks the backend `/health` endpoint to ensure the server hasn't crashed.

---

## 6. Monitoring Strategy
- **Centralized Logs:** We will just look at **Render Logs** for the backend and **Vercel Logs** for the frontend.
- **Health Verification:** A simple ping to `/health` every 5 minutes to make sure the backend is alive.
- **Constraint Compliance:** No crazy monitoring setups like ELK or Prometheus. Built-in logs are good enough for us.

---

## 7. Security Enforcement
- **Secrets Management:**
  - Put CI/CD secrets inside **GitHub Secrets**.
  - Put production secrets inside the **Render** and **Vercel** dashboards.
- **No Hardcoding:** Absolutely no pushing `.env` files or hardcoded passwords to Git.
- **Shift-Left Scanning:** `npm audit` runs early in the PR to catch bad packages before they make it to production.

---

## 8. Risk Handling & Rollback Strategy
- **Quick Reverts:**
  - **Frontend:** Vercel gives us a 1-click button to "Rollback to previous deployment" from their dashboard.
  - **Backend:** Render lets us deploy an older commit with 1-click.
- **Git Reverts:** If something bad slips through, we do a `git revert <commit-hash>`. This creates a new PR that undoes the bad code, and it still has to pass CI before going live.

---

## 9. Commit Strategy Planning (Roadmap)

We will use simple, human-readable commit messages. No confusing jargon, just plain English explaining exactly what was done in each step, almost like what a junior dev would write when focusing on getting the job done.

**Estimated Commit Count:** ~15 Commits

**Folder-wise Distribution:**
- `root/`: ~2 commits
- `se-backend/`: ~4 commits
- `se-frontend/`: ~3 commits
- `.github/workflows/`: ~5 commits
- `docs/`: ~1 commit

### Logical Phasing Plan

#### Phase 1: Repository Rules & Setup
*Est. Commits: 2*
- `added devops planning page`
- `updated readme with local setup instructions`

#### Phase 2: CI Skeleton & Security Scans
*Est. Commits: 3*
- `added basic github actions workflow file`
- `caching node modules to make the pipeline faster`
- `added npm audit to check for security vulnerabilities`

#### Phase 3: Lint Enforcement
*Est. Commits: 4*
- `setting up eslint rules for the frontend`
- `setting up eslint rules for the backend`
- `making github actions fail if frontend has eslint errors`
- `making github actions fail if backend has eslint errors`

#### Phase 4: Docker Integration
*Est. Commits: 3*
- `added a dockerfile to the backend`
- `ignoring node_modules in docker`
- `making sure docker builds successfully in the CI pipeline`

#### Phase 5: Deployment Validation
*Est. Commits: 2*
- `added a health check endpoint for the backend`
- `added pipeline check to ensure frontend build passes`

#### Phase 6: Documentation Finalization
*Est. Commits: 1*
- `wrote down how our deployment and CI works in the docs`

---
*(Future Phase: Tester Validation Logic - To be executed once testing files are provided)*
