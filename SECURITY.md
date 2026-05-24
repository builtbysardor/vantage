# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` (latest) | Yes |
| Older releases | No — please upgrade |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing:

**security@vantage.dev**

Include as much of the following as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce or proof-of-concept code
- Affected component(s) and version(s)
- Any suggested mitigations

### What to expect

| Step | Timeline |
|------|----------|
| Acknowledgement of your report | Within **48 hours** |
| Confirmation and severity assessment | Within **5 business days** |
| Patch release (critical/high severity) | Within **7 days** of confirmation |
| Public disclosure (coordinated) | After patch is released |

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). We will credit you in the release notes unless you prefer to remain anonymous.

## Scope

The following are **in scope**:

- Authentication and authorization flaws
- Remote code execution
- SQL / NoSQL injection
- Cross-site scripting (XSS) or CSRF
- Sensitive data exposure
- Dependency vulnerabilities with a direct exploit path

The following are **out of scope**:

- Denial-of-service attacks
- Social engineering of maintainers
- Issues in third-party dependencies without a direct exploit path (open an issue instead)

## Security Best Practices for Operators

- Change the default `admin` / `infrawatch` credentials immediately after deployment.
- Store all secrets in environment variables — never commit `.env` files.
- Run behind a reverse proxy (nginx / Traefik) with TLS in production.
- Restrict PostgreSQL and Redis ports to the internal Docker network.
- Keep all images and dependencies up to date.
