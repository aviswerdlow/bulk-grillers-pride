const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Sort tests for optimal performance
    const copyTests = Array.from(tests);
    
    return copyTests.sort((testA, testB) => {
      // 1. Prioritize previously failing tests (fail fast)
      const failedA = testA.failureMessages && testA.failureMessages.length > 0;
      const failedB = testB.failureMessages && testB.failureMessages.length > 0;
      if (failedA && !failedB) return -1;
      if (!failedA && failedB) return 1;
      
      // 2. Run unit tests before integration tests
      const isUnitA = testA.path.includes('unit') || testA.path.includes('__tests__');
      const isUnitB = testB.path.includes('unit') || testB.path.includes('__tests__');
      const isIntegrationA = testA.path.includes('integration') || testA.path.includes('e2e');
      const isIntegrationB = testB.path.includes('integration') || testB.path.includes('e2e');
      
      if (isUnitA && isIntegrationB) return -1;
      if (isIntegrationA && isUnitB) return 1;
      
      // 3. Run smaller test files first
      const sizeA = testA.context?.config?.testEnvironment === 'node' ? 0 : 1;
      const sizeB = testB.context?.config?.testEnvironment === 'node' ? 0 : 1;
      if (sizeA !== sizeB) return sizeA - sizeB;
      
      // 4. Sort by test duration (fastest first) if available
      if (testA.duration !== undefined && testB.duration !== undefined) {
        return testA.duration - testB.duration;
      }
      
      // 5. Alphabetical order as fallback
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;