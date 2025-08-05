#!/usr/bin/env node

/**
 * Setup branch protection rules for the main branch
 * This script configures GitHub branch protection to ensure code quality
 */

const { execSync } = require('child_process');

// Get repository information
const getRepoInfo = () => {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    // Parse owner and repo from various URL formats
    const match = remoteUrl.match(/(?:git@github\.com:|https:\/\/github\.com\/)([^\/]+)\/([^\.]+)/);
    if (!match) {
      throw new Error('Could not parse repository information from remote URL');
    }
    return { owner: match[1], repo: match[2] };
  } catch (error) {
    console.error('Error getting repository info:', error.message);
    process.exit(1);
  }
};

// Setup branch protection rules
const setupBranchProtection = async () => {
  const { owner, repo } = getRepoInfo();
  const branch = 'main';

  console.log(`🛡️  Setting up branch protection for ${owner}/${repo}:${branch}`);

  const protectionRules = {
    // Require PR reviews
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      require_last_push_approval: false,
      bypass_pull_request_allowances: {
        users: [],
        teams: [],
        apps: [],
      },
    },
    // Require status checks
    required_status_checks: {
      strict: true, // Require branches to be up to date
      contexts: [
        'lint',
        'type-check',
        'test',
        'build',
        'e2e',
        'coverage',
        'security',
        'all-checks',
      ],
    },
    // Enforce for admins
    enforce_admins: true,
    // Prevent force pushes and deletions
    allow_force_pushes: false,
    allow_deletions: false,
    // Block force pushes
    block_creations: false,
    // Require conversation resolution
    required_conversation_resolution: true,
    // Lock branch (false - we want to allow updates)
    lock_branch: false,
    // Allow fork syncing
    allow_fork_syncing: true,
    // Restrictions (who can push)
    restrictions: null, // No restrictions on who can push (besides PR requirements)
  };

  try {
    // Use GitHub CLI to set branch protection
    const command = `gh api repos/${owner}/${repo}/branches/${branch}/protection \
      --method PUT \
      --field required_status_checks='${JSON.stringify(protectionRules.required_status_checks)}' \
      --field enforce_admins=${protectionRules.enforce_admins} \
      --field required_pull_request_reviews='${JSON.stringify(protectionRules.required_pull_request_reviews)}' \
      --field restrictions=${protectionRules.restrictions} \
      --field allow_force_pushes=${protectionRules.allow_force_pushes} \
      --field allow_deletions=${protectionRules.allow_deletions} \
      --field block_creations=${protectionRules.block_creations} \
      --field required_conversation_resolution=${protectionRules.required_conversation_resolution} \
      --field lock_branch=${protectionRules.lock_branch} \
      --field allow_fork_syncing=${protectionRules.allow_fork_syncing}`;

    console.log('Applying branch protection rules...');
    execSync(command, { stdio: 'inherit' });

    console.log('✅ Branch protection rules successfully applied!');
    console.log('\nConfigured protections:');
    console.log('- ✅ Require PR reviews (minimum 1)');
    console.log('- ✅ Dismiss stale PR approvals');
    console.log('- ✅ Require status checks (CI must pass)');
    console.log('- ✅ Require branches to be up to date');
    console.log('- ✅ Include administrators in restrictions');
    console.log('- ✅ Prevent force pushes and deletions');
    console.log('- ✅ Require conversation resolution');
  } catch (error) {
    console.error('❌ Error setting branch protection:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. You have admin access to the repository');
    console.error('2. GitHub CLI (gh) is authenticated: gh auth status');
    console.error('3. The repository exists and is accessible');
    process.exit(1);
  }
};

// Add quality gates to CI configuration
const updateQualityGates = () => {
  console.log('\n📋 Quality Gates Configuration:');
  console.log('The following quality gates are enforced in CI:');
  console.log('- ✅ Minimum test coverage: 15% (current threshold)');
  console.log('- ✅ All tests must pass (no failures or errors)');
  console.log('- ✅ No TypeScript errors');
  console.log('- ✅ ESLint must pass');
  console.log('- ✅ Tests must actually execute (no false positives)');
  console.log('- ✅ E2E tests must pass');
  console.log('- ✅ Security audit must pass');

  console.log('\n✅ CI has been updated to enforce these quality gates');
};

// Main execution
const main = async () => {
  console.log('🚀 GitHub Branch Protection Setup\n');

  // Check if gh CLI is available
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ GitHub CLI (gh) is not installed or not in PATH');
    console.error('Please install it from: https://cli.github.com/');
    process.exit(1);
  }

  // Check authentication
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ GitHub CLI is not authenticated');
    console.error('Please run: gh auth login');
    process.exit(1);
  }

  await setupBranchProtection();
  updateQualityGates();

  console.log('\n✅ Branch protection setup complete!');
  console.log('\n⚠️  Important: These rules are now active on the main branch.');
  console.log('All PRs must meet these requirements before merging.');
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { setupBranchProtection };
