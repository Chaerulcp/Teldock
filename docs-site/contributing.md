---
title: Contributing
description: How to contribute to Teldock, including coding standards, local checks, and the pull request process.
---

# Contributing

Thanks for your interest in improving Teldock. This page summarizes how to propose changes, the
coding standards the project follows, and the checks your change must pass before it can be merged.

## Getting started

1. Fork the repository on GitHub.
2. Clone your fork and add the upstream remote:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Teldock.git
   cd Teldock
   git remote add upstream https://github.com/Chaerulcp/Teldock.git
   ```

3. Install dependencies for the part you are changing:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Run the development servers (in separate terminals):

   ```bash
   cd backend && npm run dev     # API on http://localhost:3001
   cd frontend && npm run dev    # SPA on http://localhost:3000
   ```

See [Installation](/guide/installation) for the full local setup, including the database and
environment file.

## How to contribute

- Look for issues labeled `good first issue` or `help wanted`.
- Comment on an issue to claim it before starting work, to avoid duplicate effort.
- For new features, open an issue to discuss the approach before implementing.
- For security vulnerabilities, do **not** open a public issue or PR; report them privately.

## Coding standards

### Layered architecture

Keep the backend layered and respect the direction of dependencies:

```text
routes → controllers → services → models
```

- **Routes** declare endpoints and bind middleware (authentication, validation).
- **Controllers** handle the request/response cycle only.
- **Services** contain reusable business logic.
- **Models** own data access and schema definitions.

Do not put database queries in routes or network calls in the presentation layer.

### Code quality

- Keep functions focused; **30–40 lines maximum**.
- Use **early returns and guard clauses**; avoid nesting deeper than two `if`/`else` levels.
- Prefer **explicit typing** and avoid `any` or undefined maps.
- Use `const` by default, `let` only when reassignment is needed, and never `var`.
- Use `async`/`await` over bare promise chains where it improves readability.
- Split files that approach 200–250 lines into smaller, focused modules.

### Security and error handling

- **No hardcoded secrets.** Read credentials from `.env`; extract magic strings into constants.
- **Never leave an empty `catch`.** Handle or rethrow with context.
- **Handle Telegram 429 responses** with exponential backoff instead of retrying immediately.
- **Validate all input** at the boundary with Zod schemas.
- Sanitize input to prevent SQL injection, XSS, SSRF, and path traversal.
- Never leak storage chat IDs or bot tokens into client responses.
- Use signed URLs for download and preview access.

### Streaming

Never buffer an entire file in memory. Use streaming or chunking for large uploads and downloads;
the existing implementation in `backend/src/services/telegram-storage.service.js` is the reference.

### Frontend

- Use functional components with hooks.
- Manage state with Zustand, not Redux.
- Handle loading and error states explicitly.
- Keep forms and dialogs accessible and responsive.

### Database

- Use Sequelize's query builder (or raw queries where appropriate) with parameterized values.
- Add indexes for frequently queried columns.
- Wrap multi-step writes in transactions.

## Run the checks locally

Run these before opening a pull request. CI runs the same commands.

```bash
# Backend: lint and unit tests
cd backend
npm run lint
npm test

# Frontend: production build must succeed
cd ../frontend
npm run build
```

::: tip
CI runs on every push to `main` and on every pull request. A pull request is only merged once the
`backend` (lint + test) and `frontend` (build) jobs are green.
:::

## Commit conventions

Teldock uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

| Type | Description |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting without behavior change |
| `refactor` | Code change that is neither a fix nor a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies, tooling |

Examples:

```bash
git commit -m "feat(auth): add email verification flow"
git commit -m "fix(upload): handle large file chunking properly"
git commit -m "docs(readme): clarify deployment requirements"
```

Avoid vague messages such as `fixed stuff`, `update`, or `WIP`.

## Pull request process

1. Create a branch from `main` using `type/scope/description`, for example `feat/email-verification`.
2. Make focused changes; keep diffs minimal and avoid unrelated refactors.
3. Add or update tests and documentation alongside the code.
4. Run the local checks above.
5. Push your branch and open a pull request against `main`.
6. Complete the PR description: what changed, the related issue, how it was tested, screenshots for
   UI changes, and any breaking changes.
7. Respond to review feedback with additional commits rather than force-pushing where possible.
8. Once approved and CI is green, a maintainer merges the PR.

### Review checklist

- [ ] Changes are limited to the requested scope.
- [ ] Layered architecture is respected.
- [ ] Inputs are validated and secrets are not hardcoded.
- [ ] Errors are handled; no empty `catch` blocks.
- [ ] Large files are streamed, not buffered.
- [ ] Tests cover the changed behavior.
- [ ] `npm run lint` and `npm test` pass in `backend`.
- [ ] `npm run build` passes in `frontend`.
- [ ] Documentation is updated when behavior changes.

## Related pages

- [Project Structure](/reference/project-structure) — where each layer lives.
- [Security](/guide/security) — the security model your change must respect.
- [Changelog](/changelog) — how releases are recorded.
