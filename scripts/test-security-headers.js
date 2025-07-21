#!/usr/bin/env node

/**
 * Test script to validate security headers configuration
 * Run with: node scripts/test-security-headers.js
 */

const https = require('https');
const http = require('http');

const EXPECTED_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-xss-protection': '1; mode=block',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': /camera=\(\), microphone=\(\)/,
  'content-security-policy': /default-src 'self'/
};

async function checkHeaders(url) {
  console.log(`\n🔍 Checking security headers for: ${url}\n`);
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      const headers = res.headers;
      let score = 0;
      const totalHeaders = Object.keys(EXPECTED_HEADERS).length;
      
      console.log('📋 Security Headers Report:\n');
      
      Object.entries(EXPECTED_HEADERS).forEach(([header, expectedValue]) => {
        const actualValue = headers[header];
        
        if (actualValue) {
          const isValid = expectedValue instanceof RegExp 
            ? expectedValue.test(actualValue)
            : actualValue === expectedValue;
            
          if (isValid) {
            console.log(`✅ ${header}: ${actualValue.substring(0, 100)}${actualValue.length > 100 ? '...' : ''}`);
            score++;
          } else {
            console.log(`⚠️  ${header}: Found but doesn't match expected value`);
            console.log(`   Expected: ${expectedValue}`);
            console.log(`   Actual: ${actualValue.substring(0, 100)}${actualValue.length > 100 ? '...' : ''}`);
          }
        } else {
          console.log(`❌ ${header}: Missing`);
        }
      });
      
      console.log(`\n📊 Score: ${score}/${totalHeaders} headers configured correctly`);
      
      if (score === totalHeaders) {
        console.log('🎉 All security headers are properly configured!');
      } else {
        console.log('⚠️  Some security headers need attention');
      }
      
      resolve(score === totalHeaders);
    }).on('error', (err) => {
      console.error('❌ Error checking headers:', err.message);
      resolve(false);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const url = args[0] || 'http://localhost:3000';
  
  console.log('🛡️  Security Headers Test\n');
  console.log('Usage: node scripts/test-security-headers.js [URL]');
  console.log('Example: node scripts/test-security-headers.js https://myapp.vercel.app\n');
  
  if (url.includes('localhost')) {
    console.log('⚠️  Note: Some headers like HSTS may not work on localhost\n');
  }
  
  const success = await checkHeaders(url);
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}