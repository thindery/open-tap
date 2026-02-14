# Contributing to aitap 🦞

Thank you for your interest in contributing to aitap! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Security](#security)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aitap.git
   cd aitap
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/thindery/aitap.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Run tests to ensure everything works
npm test
```

### Git Hooks

This project uses Git hooks to ensure code quality. They run automatically:

- **Pre-commit**: Runs linting and security scans
- **Pre-push**: Runs the full test suite

Hooks are managed by Husky and install automatically with `npm install`.

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check the [existing issues](https://github.com/thindery/aitap/issues) to avoid duplicates
2. Update to the latest version to see if the bug is already fixed

When submitting a bug report, please include:

- **OS and version** (e.g., macOS 14.0, Ubuntu 22.04)
- **Node.js version** (`node --version`)
- **Clear description** of the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Code samples** or **error messages** if applicable

Use our [Bug Report Template](https://github.com/thindery/aitap/issues/new?template=bug_report.yml)

### Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been requested
2. Provide a clear use case and motivation
3. Explain how it benefits the project and users

Use our [Feature Request Template](https://github.com/thindery/aitap/issues/new?template=feature_request.yml)

### Pull Requests

1. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes** following our coding standards
3. **Add tests** for new functionality
4. **Ensure all tests pass**:
   ```bash
   npm test
   ```
5. **Update documentation** if needed
6. **Commit** with a clear message (see [Commit Guidelines](#commit-message-guidelines))
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request** against the `main` branch

## Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using `Closes #123` or `Relates to #123`
3. **Ensure CI checks pass** (tests, linting, security scan)
4. **Request review** from maintainers
5. **Address review feedback** promptly
6. **Maintainers will merge** once approved

### PR Checklist

- [ ] Tests added/updated for new code
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] Commit messages are clear and descriptive
- [ ] No merge conflicts

## Coding Standards

### JavaScript Style

- Use ES6+ features
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- camelCase for variables and functions
- PascalCase for classes

### Linting

This project uses ESLint. Run manually:

```bash
npm run lint
```

Or let the pre-commit hook catch issues automatically.

## Testing

We use **Vitest** for testing. Write tests for:

- New features
- Bug fixes
- Edge cases

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# UI mode
npm run test:ui
```

### Coverage Requirements

- New code should maintain or improve coverage
- Critical paths must have tests

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `security`: Security-related changes

### Examples

```
feat(p2p): add automatic peer discovery via mDNS

fix(relay): prevent memory leak on websocket close

docs(readme): update installation instructions

refactor(protocol): simplify message envelope structure
```

## Security

For security-related issues, please see our [Security Policy](SECURITY.md).

**Never** commit:
- API keys or secrets
- Private keys
- Personal information
- `.env` files

These are automatically blocked by our pre-commit hooks, but please be vigilant.

## Questions?

- Open a [Discussion](https://github.com/thindery/aitap/discussions) for general questions
- Join our [Discord](https://discord.gg/aitap) (coming soon!)

## Attribution

This contributing guide was adapted from templates by GitHub and various open source projects.

Thank you for contributing! 🦞
