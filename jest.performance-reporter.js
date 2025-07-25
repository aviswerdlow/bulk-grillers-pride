class PerformanceReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.threshold = options.threshold || 1000; // 1 second default
    this.slowTests = [];
  }

  onTestResult(test, testResult) {
    // Track slow tests
    testResult.testResults.forEach((result) => {
      if (result.duration && result.duration > this.threshold) {
        this.slowTests.push({
          title: result.title,
          fullName: result.fullName,
          duration: result.duration,
          testPath: test.path,
        });
      }
    });
  }

  onRunComplete(contexts, results) {
    if (this.slowTests.length === 0) {
      return;
    }

    console.log('\n\n📊 Performance Report - Slow Tests\n');
    console.log(`Found ${this.slowTests.length} tests slower than ${this.threshold}ms:\n`);

    // Sort by duration (slowest first)
    this.slowTests.sort((a, b) => b.duration - a.duration);

    // Show top 10 slowest tests
    this.slowTests.slice(0, 10).forEach((test, index) => {
      console.log(
        `${index + 1}. ${test.fullName}\n` +
        `   Duration: ${test.duration}ms\n` +
        `   File: ${test.testPath}\n`
      );
    });

    // Summary statistics
    const totalSlowTime = this.slowTests.reduce((acc, test) => acc + test.duration, 0);
    const avgSlowTime = Math.round(totalSlowTime / this.slowTests.length);
    
    console.log('\n📈 Summary:');
    console.log(`   Total slow test time: ${totalSlowTime}ms`);
    console.log(`   Average slow test time: ${avgSlowTime}ms`);
    console.log(`   Slowest test: ${this.slowTests[0].duration}ms`);
    
    // Provide optimization suggestions
    console.log('\n💡 Optimization suggestions:');
    if (this.slowTests.some(t => t.testPath.includes('integration'))) {
      console.log('   - Consider mocking external dependencies in integration tests');
    }
    if (this.slowTests.some(t => t.duration > 5000)) {
      console.log('   - Tests over 5s should be reviewed for unnecessary delays');
    }
    console.log('   - Use --runInBand for debugging specific slow tests');
    console.log('   - Consider splitting large test files into smaller ones\n');
  }
}

module.exports = PerformanceReporter;