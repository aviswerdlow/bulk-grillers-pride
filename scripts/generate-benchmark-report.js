#!/usr/bin/env node

/**
 * Benchmark Report Generator
 * 
 * Generates HTML and JSON reports from benchmark results
 */

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('input', {
    alias: 'i',
    description: 'Input JSON file with benchmark results',
    default: 'benchmark-results.json',
  })
  .option('output', {
    alias: 'o',
    description: 'Output file path',
    default: 'benchmark-report',
  })
  .option('format', {
    alias: 'f',
    description: 'Output format',
    choices: ['html', 'json', 'both'],
    default: 'both',
  })
  .help()
  .argv;

function generateReport() {
  // Read benchmark results
  if (!fs.existsSync(argv.input)) {
    console.error(`❌ Input file not found: ${argv.input}`);
    process.exit(1);
  }
  
  const results = JSON.parse(fs.readFileSync(argv.input, 'utf8'));
  
  console.log('📊 Generating benchmark report...');
  
  // Generate JSON report if requested
  if (argv.format === 'json' || argv.format === 'both') {
    generateJSONReport(results);
  }
  
  // Generate HTML report if requested
  if (argv.format === 'html' || argv.format === 'both') {
    generateHTMLReport(results);
  }
  
  console.log('✅ Report generation complete!');
}

function generateJSONReport(results) {
  const report = {
    summary: extractSummary(results),
    comparison: results.report?.comparison || results.fullComparison?.comparison,
    langchain: results.report?.langchain || results.fullComparison?.langchain,
    crewai: results.report?.crewai || results.fullComparison?.crewai,
    recommendations: generateRecommendations(results),
    timestamp: new Date().toISOString(),
  };
  
  const outputPath = `${argv.output}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to: ${outputPath}`);
}

function generateHTMLReport(results) {
  const summary = extractSummary(results);
  const comparison = results.report?.comparison || results.fullComparison?.comparison;
  const langchain = results.report?.langchain || results.fullComparison?.langchain;
  const crewai = results.report?.crewai || results.fullComparison?.crewai;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Benchmark Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        h1 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        
        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .metric-title {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .metric-comparison {
            font-size: 14px;
        }
        
        .improvement {
            color: #27ae60;
        }
        
        .regression {
            color: #e74c3c;
        }
        
        .neutral {
            color: #95a5a6;
        }
        
        .comparison-table {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e9ecef;
        }
        
        td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        .success-criteria {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .criteria-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .criteria-status {
            width: 24px;
            height: 24px;
            margin-right: 10px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
        }
        
        .pass {
            background: #27ae60;
        }
        
        .fail {
            background: #e74c3c;
        }
        
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            height: 400px;
        }
        
        .recommendation {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 30px;
        }
        
        .recommendation h3 {
            margin-top: 0;
            color: #2980b9;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>Performance Benchmark Report</h1>
        <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="metrics-grid">
        ${generateMetricCard('Response Time (P95)', 
            crewai?.responseTime?.p95 ? `${crewai.responseTime.p95}ms` : 'N/A',
            comparison?.responseTimeImprovement?.p95
        )}
        ${generateMetricCard('Throughput', 
            crewai?.throughput?.mean ? `${Math.round(crewai.throughput.mean)} /min` : 'N/A',
            comparison?.throughputImprovement
        )}
        ${generateMetricCard('Error Rate', 
            crewai?.quality?.errorRate !== undefined ? `${(crewai.quality.errorRate * 100).toFixed(2)}%` : 'N/A',
            crewai && langchain ? ((langchain.quality.errorRate - crewai.quality.errorRate) / langchain.quality.errorRate) * 100 : null
        )}
        ${generateMetricCard('Cost per Product', 
            crewai?.cost?.mean ? `$${crewai.cost.mean.toFixed(4)}` : 'N/A',
            comparison?.costReduction
        )}
    </div>
    
    <div class="comparison-table">
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>LangChain</th>
                    <th>CrewAI</th>
                    <th>Difference</th>
                </tr>
            </thead>
            <tbody>
                ${generateComparisonRow('Response Time P50', 
                    langchain?.responseTime?.p50, 
                    crewai?.responseTime?.p50,
                    'ms', true
                )}
                ${generateComparisonRow('Response Time P95', 
                    langchain?.responseTime?.p95, 
                    crewai?.responseTime?.p95,
                    'ms', true
                )}
                ${generateComparisonRow('Response Time P99', 
                    langchain?.responseTime?.p99, 
                    crewai?.responseTime?.p99,
                    'ms', true
                )}
                ${generateComparisonRow('Throughput', 
                    langchain?.throughput?.mean, 
                    crewai?.throughput?.mean,
                    ' products/min', false
                )}
                ${generateComparisonRow('Accuracy', 
                    langchain?.quality?.accuracy ? langchain.quality.accuracy * 100 : null, 
                    crewai?.quality?.accuracy ? crewai.quality.accuracy * 100 : null,
                    '%', false
                )}
                ${generateComparisonRow('Token Usage', 
                    langchain?.resourceUsage?.avgTokens, 
                    crewai?.resourceUsage?.avgTokens,
                    ' tokens', true
                )}
                ${generateComparisonRow('Memory Usage', 
                    langchain?.resourceUsage?.avgMemoryMB, 
                    crewai?.resourceUsage?.avgMemoryMB,
                    ' MB', true
                )}
            </tbody>
        </table>
    </div>
    
    <div class="success-criteria">
        <h2>Success Criteria</h2>
        ${generateCriteriaItem('Response Time < 5s (P95)', comparison?.meetsSuccessCriteria?.responseTime)}
        ${generateCriteriaItem('Throughput > 750 products/min', comparison?.meetsSuccessCriteria?.throughput)}
        ${generateCriteriaItem('Error Rate < 1%', comparison?.meetsSuccessCriteria?.errorRate)}
    </div>
    
    <div class="chart-container">
        <canvas id="performanceChart"></canvas>
    </div>
    
    ${generateRecommendationSection(results)}
    
    <script>
        // Create performance comparison chart
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Response Time (P95)', 'Throughput', 'Accuracy', 'Cost Efficiency'],
                datasets: [{
                    label: 'LangChain',
                    data: [
                        ${langchain?.responseTime?.p95 || 0},
                        ${langchain?.throughput?.mean || 0},
                        ${langchain?.quality?.accuracy ? langchain.quality.accuracy * 100 : 0},
                        ${langchain?.cost?.mean ? 100 / langchain.cost.mean : 0}
                    ],
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }, {
                    label: 'CrewAI',
                    data: [
                        ${crewai?.responseTime?.p95 || 0},
                        ${crewai?.throughput?.mean || 0},
                        ${crewai?.quality?.accuracy ? crewai.quality.accuracy * 100 : 0},
                        ${crewai?.cost?.mean ? 100 / crewai.cost.mean : 0}
                    ],
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Comparison'
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  
  const outputPath = `${argv.output}.html`;
  fs.writeFileSync(outputPath, html);
  console.log(`📄 HTML report saved to: ${outputPath}`);
}

function extractSummary(results) {
  if (results.summary) {
    return results.summary;
  }
  
  // Extract from A/B test results
  if (results.abResults) {
    return {
      winner: results.abResults.winner,
      metrics: results.abResults.metrics,
    };
  }
  
  return {};
}

function generateMetricCard(title, value, improvement) {
  const improvementClass = improvement > 0 ? 'improvement' : improvement < 0 ? 'regression' : 'neutral';
  const improvementText = improvement !== null && improvement !== undefined
    ? `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`
    : '';
  
  return `
    <div class="metric-card">
        <div class="metric-title">${title}</div>
        <div class="metric-value">${value}</div>
        ${improvementText ? `<div class="metric-comparison ${improvementClass}">${improvementText}</div>` : ''}
    </div>
  `;
}

function generateComparisonRow(metric, langchainValue, crewaiValue, unit, lowerIsBetter) {
  const lcValue = langchainValue !== null && langchainValue !== undefined 
    ? `${typeof langchainValue === 'number' ? langchainValue.toFixed(2) : langchainValue}${unit}` 
    : 'N/A';
  const caValue = crewaiValue !== null && crewaiValue !== undefined 
    ? `${typeof crewaiValue === 'number' ? crewaiValue.toFixed(2) : crewaiValue}${unit}` 
    : 'N/A';
  
  let difference = '';
  let diffClass = '';
  
  if (langchainValue !== null && crewaiValue !== null && langchainValue !== undefined && crewaiValue !== undefined) {
    const diff = ((crewaiValue - langchainValue) / langchainValue) * 100;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    diffClass = improved ? 'improvement' : 'regression';
    difference = `<span class="${diffClass}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>`;
  }
  
  return `
    <tr>
        <td><strong>${metric}</strong></td>
        <td>${lcValue}</td>
        <td>${caValue}</td>
        <td>${difference}</td>
    </tr>
  `;
}

function generateCriteriaItem(label, passed) {
  const status = passed ? 'pass' : 'fail';
  const icon = passed ? '✓' : '✗';
  
  return `
    <div class="criteria-item">
        <div class="criteria-status ${status}">${icon}</div>
        <div>${label}</div>
    </div>
  `;
}

function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.abResults?.recommendation) {
    recommendations.push(results.abResults.recommendation);
  }
  
  const comparison = results.report?.comparison || results.fullComparison?.comparison;
  if (comparison) {
    if (comparison.responseTimeImprovement?.p95 > 10) {
      recommendations.push(`CrewAI shows ${comparison.responseTimeImprovement.p95.toFixed(1)}% faster response times.`);
    }
    if (comparison.throughputImprovement > 10) {
      recommendations.push(`CrewAI achieves ${comparison.throughputImprovement.toFixed(1)}% higher throughput.`);
    }
    if (comparison.costReduction > 10) {
      recommendations.push(`CrewAI reduces costs by ${comparison.costReduction.toFixed(1)}%.`);
    }
  }
  
  return recommendations;
}

function generateRecommendationSection(results) {
  const recommendations = generateRecommendations(results);
  
  if (recommendations.length === 0) {
    return '';
  }
  
  return `
    <div class="recommendation">
        <h3>Recommendations</h3>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
  `;
}

// Run the report generator
generateReport();