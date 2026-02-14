# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |
| < 0.0.1 | :x:                |

As this project is pre-1.0, we recommend always using the latest version.

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us in a responsible manner.

### Reporting Process

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email**: security@aitap.dev (or DM @thindery if email unavailable)
2. **GitHub Security Advisory**: [Report a vulnerability](https://github.com/thindery/aitap/security/advisories/new)

### What to Include

Please include as much of the following information as possible:

- **Description**: Clear description of the vulnerability
- **Impact**: What could an attacker do with this vulnerability?
- **Reproduction**: Step-by-step instructions to reproduce the issue
- **Environment**: OS, Node.js version, aitap version
- **Proof of Concept**: Code or screenshots demonstrating the vulnerability
- **Suggested Fix**: If you have ideas on how to fix it (optional)
- **Your Contact**: How to reach you for follow-up questions

### Response Timeline

We aim to respond to security reports within:

| Timeframe | Action |
|-----------|--------|
| 24 hours | Acknowledge receipt |
| 72 hours | Initial assessment |
| 7 days | Fix or mitigation plan |
| 14 days | Security patch release (critical issues) |
| 30 days | Security patch release (standard issues) |

For critical vulnerabilities, we may expedite this timeline.

### Disclosure Policy

We follow a **coordinated disclosure** process:

1. **Acknowledge** receipt of the report
2. **Confirm** the vulnerability and determine severity
3. **Prepare** a fix internally
4. **Release** the fix and security advisory simultaneously
5. **Credit** the reporter (if they desire) in the advisory

We request that you:
- Give us reasonable time to address the issue before public disclosure
- Do not access, modify, or delete data belonging to others
- Do not degrade the performance of our services
- Keep vulnerability details confidential until we publicly disclose

## Security Best Practices

### For Users

1. **Keep dependencies updated**: Run `npm audit fix` regularly
2. **Use the latest version**: Security fixes are released promptly
3. **Validate inputs**: When integrating aitap, sanitize user inputs
4. **Secure your environment**: Keep `NODE_ENV=production` in production
5. **Review permissions**: Run with minimal required privileges

### For Contributors

1. **Never commit secrets**: API keys, passwords, tokens should never be in code
2. **Validate all inputs**: Check data types, lengths, and formats
3. **Use parameterized queries**: If implementing database features
4. **Sanitize outputs**: Escape special characters where appropriate
5. **Follow least privilege**: Request minimal permissions in code

## Security Features

aitap implements the following security measures:

- **Cryptographic identity**: TweetNaCl for secure peer identification
- **Message integrity**: Signed messages to prevent tampering
- **No persistent storage**: Messages are ephemeral by default
- **Minimal attack surface**: Small, focused codebase

## Security Checklist for Releases

Before each release, we verify:

- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] No secrets in codebase (checked by CI)
- [ ] All dependencies are up to date
- [ ] Security headers configured (for relay/meetingpoint)
- [ ] Input validation tests pass

## Automated Security

Our CI pipeline includes:

- **Dependabot**: Automated dependency updates
- **Secret scanning**: Prevents accidental secret commits
- **npm audit**: Checks for known vulnerabilities
- **CodeQL**: Static analysis for security issues

## Hall of Fame

We gratefully acknowledge security researchers who have responsibly disclosed vulnerabilities:

*No entries yet — be the first!*

## Contact

- Security Email: security@aitap.dev
- Maintainer: @thindery
- GitHub Security: [Report](https://github.com/thindery/aitap/security/advisories/new)

## Acknowledgments

This security policy was adapted from the [GitHub Security Policy template](https://github.com/github/securitylab/blob/main/docs/security-policy.md).

---

**Last Updated**: February 2025
