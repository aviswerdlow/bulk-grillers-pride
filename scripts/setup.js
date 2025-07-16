#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log(`
╔═══════════════════════════════════════════════════════╗
║         Welcome to Bulk Grillers Pride Setup!         ║
╚═══════════════════════════════════════════════════════╝
`);

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [
    {
      name: 'Node.js',
      command: 'node --version',
      minVersion: '18.0.0',
      parseVersion: (output) => output.trim().replace('v', ''),
    },
    {
      name: 'npm',
      command: 'npm --version',
      minVersion: '9.0.0',
      parseVersion: (output) => output.trim(),
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: 'utf8' });
      const version = check.parseVersion(output);
      const isValid = compareVersions(version, check.minVersion) >= 0;

      if (isValid) {
        console.log(`✅ ${check.name} ${version} (minimum: ${check.minVersion})`);
      } else {
        console.log(`❌ ${check.name} ${version} is below minimum ${check.minVersion}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(
        `❌ ${check.name} not found. Please install ${check.name} ${check.minVersion} or higher.`
      );
      allPassed = false;
    }
  }

  return allPassed;
}

function compareVersions(version1, version2) {
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

async function setupEnvironment() {
  console.log('\n📋 Setting up environment variables...\n');

  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envPath = path.join(__dirname, '..', '.env.local');
  const webEnvPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');

  // Create .env.example if it doesn't exist
  if (!fs.existsSync(envExamplePath)) {
    const envExampleContent = `# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=

# Optional: AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
`;
    fs.writeFileSync(envExamplePath, envExampleContent);
    console.log('✅ Created .env.example template');
  }

  // Check if .env.local exists
  if (fs.existsSync(envPath) || fs.existsSync(webEnvPath)) {
    console.log('ℹ️  Environment files already exist. Skipping environment setup.');
    console.log('   To reconfigure, delete .env.local files and run setup again.');
    return;
  }

  console.log('📝 Please provide the following environment variables:');
  console.log('   (Press Enter to skip optional variables)\n');

  const envVars = {};

  // Required variables
  envVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = await question(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (required): '
  );
  envVars.CLERK_SECRET_KEY = await question('CLERK_SECRET_KEY (required): ');
  envVars.NEXT_PUBLIC_CONVEX_URL = await question('NEXT_PUBLIC_CONVEX_URL (required): ');

  // Validate required variables
  const requiredVars = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CONVEX_URL',
  ];
  const missingVars = requiredVars.filter((key) => !envVars[key]);

  if (missingVars.length > 0) {
    console.log('\n❌ Missing required environment variables:', missingVars.join(', '));
    console.log('   Please run setup again with all required variables.');
    process.exit(1);
  }

  // Optional variables
  envVars.OPENAI_API_KEY = await question('OPENAI_API_KEY (optional): ');
  envVars.ANTHROPIC_API_KEY = await question('ANTHROPIC_API_KEY (optional): ');

  // Create .env.local content
  const envContent = Object.entries(envVars)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Write to both root and web app directories
  fs.writeFileSync(envPath, envContent);
  fs.writeFileSync(webEnvPath, envContent);

  console.log('\n✅ Environment files created successfully!');
}

async function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');

  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

async function setupConvex() {
  console.log('\n🔧 Setting up Convex...\n');

  try {
    execSync('npm run convex:setup', { stdio: 'inherit' });
    console.log('✅ Convex setup completed successfully!');
  } catch (error) {
    console.error('❌ Failed to setup Convex:', error.message);
    console.log('   Please check your Convex configuration and try again.');
    process.exit(1);
  }
}

async function runChecks() {
  console.log('\n🧪 Running verification checks...\n');

  const checks = [
    { name: 'TypeScript compilation', command: 'npm run type-check' },
    { name: 'Linting', command: 'npm run lint' },
    { name: 'Tests', command: 'npm test' },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      console.log(`Running ${check.name}...`);
      execSync(check.command, { stdio: 'pipe' });
      console.log(`✅ ${check.name} passed`);
    } catch (error) {
      console.log(`⚠️  ${check.name} had issues (this is normal for a new setup)`);
      allPassed = false;
    }
  }

  return allPassed;
}

async function printNextSteps() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                  Setup Complete! 🎉                   ║
╚═══════════════════════════════════════════════════════╝

Next steps:

1. Start the development servers:
   npm run dev

2. Open your browser:
   - Web app: http://localhost:3000
   - Convex dashboard: https://dashboard.convex.dev

3. Set up your first organization:
   - Sign up/in with Clerk
   - Complete the onboarding process

4. Check the documentation:
   - README.md for project overview
   - docs/TESTING.md for testing guide
   - AGENTS_BOARD.md for development tasks

Happy coding! 🚀
`);
}

async function main() {
  try {
    // Check prerequisites
    const prereqsPassed = await checkPrerequisites();
    if (!prereqsPassed) {
      console.log('\n❌ Please install missing prerequisites and run setup again.');
      process.exit(1);
    }

    // Setup environment
    await setupEnvironment();

    // Install dependencies
    await installDependencies();

    // Setup Convex
    await setupConvex();

    // Run verification checks
    await runChecks();

    // Print next steps
    await printNextSteps();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
main();
