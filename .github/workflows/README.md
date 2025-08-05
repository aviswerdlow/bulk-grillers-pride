# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for the Bulk Grillers Pride project.

## 🛡️ Branch Protection

The `main` branch is protected with strict quality gates. See [BRANCH_PROTECTION.md](../BRANCH_PROTECTION.md) for details.

### Key Protection Features:
- ✅ Requires PR approval before merging
- ✅ All CI checks must pass
- ✅ No direct pushes to main
- ✅ Tests must actually execute (no false positives)

## Security Workflow (`security.yml`)

The security workflow implements automated security scanning with multiple layers of protection:

### Components

1. **NPM Audit**
   - Runs dependency vulnerability scanning
   - Configurable severity threshold (moderate/high/critical)
   - Generates detailed reports and PR comments
   - Fails builds based on threshold settings

2. **CodeQL Analysis**
   - Static code analysis for JavaScript/TypeScript
   - Detects security vulnerabilities and code quality issues
   - Integrates with GitHub Security tab

3. **Dependency Review**
   - Reviews dependency changes in PRs
   - Checks for known vulnerabilities
   - Validates license compliance

4. **License Compliance**
   - Ensures all dependencies use approved licenses
   - Allowed licenses: MIT, ISC, BSD, Apache-2.0, CC0, CC-BY, Unlicense
   - Generates license summary reports

5. **Secret Scanning**
   - Uses Gitleaks to detect exposed secrets
   - Scans full git history
   - Prevents accidental credential commits

6. **OWASP Dependency Check**
   - Advanced vulnerability detection
   - Checks for retired packages
   - Generates HTML and JSON reports

### Security Levels

Configure the `SECURITY_LEVEL` environment variable:
- `moderate`: Fails on moderate+ vulnerabilities (default)
- `high`: Fails on high+ vulnerabilities
- `critical`: Fails only on critical vulnerabilities

### Reports

Security scan results are uploaded as artifacts:
- `npm-audit-report`: NPM audit results
- `license-report`: License compliance summary
- `owasp-dependency-check-report`: OWASP scan results

### Automated Issue Creation

When scheduled scans fail, the workflow automatically creates a GitHub issue with:
- Failure summary
- Link to workflow run
- Required actions
- Assignment to @aviswerdlow
- Quality agent label for tracking

### Running Locally

```bash
# NPM audit
npm audit --audit-level=moderate

# License check
npx license-checker --production --summary

# Run all security checks
npm run security:check
```

## CI Workflow (`ci.yml`)

Main continuous integration pipeline with enhanced reliability:

### Features
- **Test Validation**: Ensures tests actually execute (no false positives)
- **JUnit Reporting**: Tracks test counts and failures
- **Coverage Validation**: Verifies coverage reports are generated
- **Sharded Testing**: Parallel test execution for speed
- **Quality Gates**: Enforces minimum standards before merge

### Jobs
- **lint**: ESLint code quality checks
- **type-check**: TypeScript type validation  
- **test**: Unit/integration tests (sharded for performance)
- **coverage**: Coverage report generation and validation
- **build**: Application build verification
- **e2e**: End-to-end testing with Playwright
- **security**: Dependency vulnerability scanning
- **all-checks**: Meta-job ensuring all checks pass

### Test Execution Validation
The CI now validates that tests run properly by:
1. Adding `--passWithNoTests=false` to prevent empty test runs
2. Checking for generated coverage reports
3. Parsing JUnit XML for test counts and failures
4. Failing if no tests were executed
5. Providing detailed test summaries in GitHub UI

## Other Workflows

- `accessibility.yml`: Accessibility testing
- `coverage-report.yml`: Test coverage reporting
- `performance-benchmark.yml`: Performance benchmarking
- `cache-warmup.yml`: Turbo cache optimization
- `deploy.yml`: Production deployment

## Best Practices

1. **Security First**: All PRs must pass security checks
2. **Cache Optimization**: Use Turbo remote caching for speed
3. **Fail Fast**: Cancel in-progress runs on new pushes
4. **Artifact Retention**: Keep security reports for 30 days
5. **Scheduled Scans**: Daily security audits for proactive detection