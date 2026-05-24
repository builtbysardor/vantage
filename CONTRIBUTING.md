# Contributing to Vantage

Thank you for your interest in contributing! Please take a moment to read these guidelines before opening an issue or pull request.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branch Naming](#branch-naming)
3. [Commit Messages](#commit-messages)
4. [Pull Request Checklist](#pull-request-checklist)
5. [Code Style](#code-style)
6. [Running Tests Locally](#running-tests-locally)

---

## Getting Started

```bash
git clone https://github.com/vantage-oss/vantage.git
cd vantage
cp .env.example .env
pnpm install
pnpm dev
```

Fork the repository, create a branch from `main`, and open a pull request when ready.

---

## Branch Naming

Use the following prefixes:

| Prefix | Purpose |
|--------|---------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `chore/` | Dependency bumps, tooling, CI |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring without behaviour change |
| `test/` | Adding or updating tests |

Examples:

```
feat/logs-page
fix/alert-acknowledge-race-condition
chore/bump-next-15-1
docs/add-architecture-diagram
```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

**Examples:**

```
feat(frontend): add logs page with level filter and auto-refresh
fix(nexus): prevent duplicate alert acknowledgement
chore(ci): add ruff lint job for infrawatch
docs(readme): add architecture diagram
```

- Use the **imperative mood** in the short description ("add" not "added").
- Keep the subject line under **72 characters**.
- Reference issues with `Closes #123` or `Fixes #123` in the footer.

---

## Pull Request Checklist

Before requesting a review, please verify:

- [ ] Branch is up to date with `main` (`git pull --rebase origin main`)
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes with no errors (frontend)
- [ ] `pnpm --filter frontend build` succeeds
- [ ] New features include relevant tests or a note explaining why tests are not applicable
- [ ] Documentation updated if behaviour or public API changed
- [ ] No secrets or `.env` files committed
- [ ] PR title follows Conventional Commits format
- [ ] PR description explains **what** changed and **why**

---

## Code Style

### Frontend (TypeScript / React)

- Functional components with TypeScript types — no `any` unless strictly necessary.
- Use Tailwind utility classes; follow the existing colour token conventions (`text-ok`, `text-critical`, `bg-surface`, etc.).
- Keep components focused — prefer many small components over one large one.
- Use `"use client"` only at the page or component boundary that actually requires it.

### Nexus API (Node.js)

- Follow existing Express router conventions in `src/routes/`.
- Validate all request inputs before processing.
- Return consistent JSON error shapes: `{ error: string }`.

### InfraWatch (Python)

- Format and lint with [ruff](https://docs.astral.sh/ruff/) (`ruff check .`).
- Type-annotate function signatures.
- Keep Celery tasks idempotent where possible.

---

## Running Tests Locally

```bash
# Frontend type-check
pnpm typecheck

# Frontend lint
pnpm lint

# Frontend build
pnpm --filter frontend build

# Nexus API tests (if present)
cd packages/nexus-api/backend && npm test

# InfraWatch lint
pip install ruff && ruff check packages/infrawatch-api/
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/vantage-oss/vantage/discussions) or reach out at **security@vantage.dev** for security-related topics.
