#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Clerk JWT Configuration for Convex...\n');

// Check for required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CONVEX_URL',
];

const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('❌ Error: .env.local file not found');
  console.log('   Please create a .env.local file with your environment variables');
  process.exit(1);
}

let hasErrors = false;

// Check for required environment variables
requiredEnvVars.forEach((varName) => {
  if (!envContent.includes(varName)) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found ${varName}`);
  }
});

// Check for CLERK_ISSUER_URL
if (!envContent.includes('CLERK_ISSUER_URL')) {
  console.warn('\n⚠️  Warning: CLERK_ISSUER_URL not found in .env.local');
  console.log('   This is optional but recommended for custom domains');
  console.log('   Default will use: https://discrete-marten-19.clerk.accounts.dev');
}

// Check auth.config.ts exists
const authConfigPath = path.join(__dirname, '..', 'convex', 'auth.config.ts');
if (!fs.existsSync(authConfigPath)) {
  console.error('\n❌ Error: convex/auth.config.ts not found');
  hasErrors = true;
} else {
  console.log('\n✅ Found convex/auth.config.ts');

  // Check content
  const authConfig = fs.readFileSync(authConfigPath, 'utf8');
  if (authConfig.includes('applicationID: "convex"')) {
    console.log('✅ Application ID is correctly set to "convex"');
  } else {
    console.error('❌ Application ID should be set to "convex"');
    hasErrors = true;
  }
}

// Check for JWT setup documentation
const jwtDocPath = path.join(__dirname, '..', 'convex', 'CLERK_JWT_SETUP.md');
if (fs.existsSync(jwtDocPath)) {
  console.log('\n📚 JWT Setup Documentation available at: convex/CLERK_JWT_SETUP.md');
}

// Instructions
console.log('\n🔧 Next Steps:');
console.log('1. Go to https://dashboard.clerk.com');
console.log('2. Navigate to Configure → JWT Templates');
console.log('3. Create a template named "convex" with:');
console.log('   - Audience (aud): "convex"');
console.log('   - Subject (sub): "{{user.id}}"');
console.log('   - Token lifetime: 60 seconds');
console.log('\n4. In Convex Dashboard (https://dashboard.convex.dev):');
console.log('   - Go to Settings → Authentication');
console.log('   - Add Clerk provider with your issuer domain');
console.log('   - Application ID: "convex"');

if (hasErrors) {
  console.log('\n❌ Validation failed. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ Configuration files are valid!');
  console.log('   Make sure to complete the Clerk Dashboard setup as described above.');
}
