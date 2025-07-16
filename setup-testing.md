# Testing Infrastructure Setup Guide

## For Infrastructure Agent

1. Install testing dependencies:

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

2. Create `jest.config.js` in root:

```javascript
module.exports = {
  projects: [
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/apps/web/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/apps/web/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/apps/web/jest.setup.js'],
    },
    {
      displayName: 'convex',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/convex/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
  ],
};
```

3. Update package.json scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```
