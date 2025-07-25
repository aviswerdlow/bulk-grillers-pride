# Integration Testing CI/CD Setup

## Overview

This document describes the integration testing setup in our CI/CD pipeline.

## CI Pipeline Structure

The CI pipeline runs tests in the following order:

1. **Unit Tests** - Fast, isolated component tests
2. **Integration Tests** - API and workflow tests
3. **E2E Tests** - Full browser-based user journey tests

## Integration Test Job

The integration test job runs after the build completes and before E2E tests.

### Configuration

```yaml
integration:
  name: Integration Tests
  runs-on: ubuntu-latest
  needs: [setup, build]
  strategy:
    matrix:
      shard: [1, 2]
```

### Test Sharding

Tests are split into 2 shards for parallel execution:
- **Shard 1**: API and workflow tests
- **Shard 2**: E2E and performance tests

### Environment Variables

Integration tests have access to:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

## Running Integration Tests Locally

```bash
# Run all integration tests
npm run test:integration

# Run specific test pattern
npm run test:integration -- --testPathPattern="api"

# Run in watch mode
npm run test:integration:watch

# Generate coverage report
npm run test:integration:coverage
```

## Test Organization

```
integration-tests/
├── api/                    # API endpoint tests
├── workflows/              # Business workflow tests
├── e2e/                    # End-to-end scenario tests
├── performance/            # Performance benchmark tests
├── fixtures/               # Test data
└── utils/                  # Test utilities
```

## Writing Integration Tests

1. Place tests in appropriate subdirectory
2. Use fixtures for test data
3. Clean up after tests complete
4. Use descriptive test names
5. Test both success and error paths

## Test Artifacts

Integration test results are uploaded as artifacts:
- Retention: 7 days
- Named by shard for easy identification
- Available for debugging failed runs

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   - Integration tests have 30-second timeout
   - Increase in jest.integration.config.js if needed

2. **Database State**
   - Tests should be independent
   - Use setup/teardown hooks properly

3. **Environment Variables**
   - Ensure all required env vars are set
   - Check GitHub Secrets configuration

### Debugging Failed Tests

1. Download test artifacts from GitHub Actions
2. Check test output logs
3. Run failing test locally with same environment
4. Use `--verbose` flag for detailed output

## Best Practices

1. **Isolation**: Tests should not depend on each other
2. **Cleanup**: Always clean up test data
3. **Assertions**: Use clear, specific assertions
4. **Performance**: Keep tests under 30 seconds
5. **Documentation**: Document complex test scenarios

## Future Improvements

1. Add test result reporting to PRs
2. Implement test flakiness detection
3. Add performance regression detection
4. Create visual test result dashboards