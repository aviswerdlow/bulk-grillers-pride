#!/bin/bash
# Setup GitHub Labels and Project Board for Multi-Agent System Migration
# Task: T155 - Set up GitHub labels and project board

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GitHub Infrastructure Setup for Multi-Agent System ===${NC}"
echo "This script will create labels and project board for task migration"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${GREEN}Repository: ${REPO}${NC}"
echo ""

# Function to create label
create_label() {
    local name=$1
    local description=$2
    local color=$3
    
    echo -n "Creating label '${name}'... "
    if gh label create "${name}" --description "${description}" --color "${color}" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}already exists${NC}"
    fi
}

# Function to delete existing labels (optional)
delete_default_labels() {
    echo -e "${YELLOW}Deleting default labels...${NC}"
    for label in "bug" "documentation" "duplicate" "enhancement" "good first issue" "help wanted" "invalid" "question" "wontfix"; do
        echo -n "Deleting '${label}'... "
        if gh label delete "${label}" --yes 2>/dev/null; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${YELLOW}not found${NC}"
        fi
    done
    echo ""
}

# Ask user if they want to delete default labels
read -p "Delete default GitHub labels? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    delete_default_labels
fi

echo -e "${BLUE}Creating Agent Assignment Labels...${NC}"
create_label "agent-frontend" "Assigned to frontend-agent" "0969DA"
create_label "agent-backend" "Assigned to backend-agent" "1F77B4"
create_label "agent-qa" "Assigned to quality-agent" "2CA02C"
create_label "agent-docs" "Assigned to docs-agent" "D62728"
create_label "agent-infra" "Assigned to infra-agent" "FF7F0E"
create_label "agent-design" "Assigned to design-agent" "8C564B"
create_label "agent-systems-design" "Assigned to systems-design-agent" "E377C2"
create_label "agent-migration" "Assigned to migration-agent" "7F7F7F"

echo -e "\n${BLUE}Creating Priority Labels...${NC}"
create_label "priority-P0" "Critical, blocking work" "B60205"
create_label "priority-P1" "High priority" "D93F0B"
create_label "priority-P2" "Normal priority" "FBCA04"
create_label "priority-P3" "Low priority" "0E8A16"

echo -e "\n${BLUE}Creating Status Labels...${NC}"
create_label "status-ready" "Dependencies met, can be claimed" "C2E0C6"
create_label "status-assigned" "Assigned to an agent" "FEF2C0"
create_label "status-in-progress" "Active work in progress" "BFDADC"
create_label "status-blocked" "Waiting on dependencies" "D4C5F9"
create_label "status-review" "In code review" "C5DEF5"
create_label "status-done" "Completed" "0E8A16"

echo -e "\n${BLUE}Creating Skill Labels...${NC}"
create_label "skill-react" "Requires React knowledge" "61DAFB"
create_label "skill-typescript" "Requires TypeScript knowledge" "3178C6"
create_label "skill-convex" "Requires Convex knowledge" "5E3AE9"
create_label "skill-nextjs" "Requires Next.js knowledge" "000000"
create_label "skill-tailwind" "Requires Tailwind CSS knowledge" "06B6D4"
create_label "skill-testing" "Requires testing knowledge" "15803D"
create_label "skill-jest" "Requires Jest knowledge" "C21325"
create_label "skill-playwright" "Requires Playwright knowledge" "2EAD33"
create_label "skill-api" "Requires API knowledge" "009688"
create_label "skill-database" "Requires database knowledge" "336791"
create_label "skill-ci-cd" "Requires CI/CD knowledge" "215732"
create_label "skill-documentation" "Requires documentation skills" "0052CC"

echo -e "\n${BLUE}Creating GitHub Project...${NC}"
# Create project
PROJECT_NAME="Multi-Agent Development Board"
echo -n "Creating project '${PROJECT_NAME}'... "

# Check if project already exists
PROJECT_ID=$(gh project list --owner "@me" --format json | jq -r ".projects[] | select(.title == \"${PROJECT_NAME}\") | .number")

if [ -z "$PROJECT_ID" ]; then
    # Create new project
    PROJECT_OUTPUT=$(gh project create --owner "@me" --title "${PROJECT_NAME}" --format json)
    PROJECT_ID=$(echo "$PROJECT_OUTPUT" | jq -r '.number')
    echo -e "${GREEN}✓ Created project #${PROJECT_ID}${NC}"
else
    echo -e "${YELLOW}already exists as #${PROJECT_ID}${NC}"
fi

# Function to create project field
create_project_field() {
    local project=$1
    local name=$2
    local type=$3
    
    echo -n "Creating field '${name}'... "
    if gh project field-create "$project" --owner "@me" --name "$name" --data-type "$type" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}already exists${NC}"
    fi
}

# Create custom fields for the project
echo -e "\n${BLUE}Setting up project fields...${NC}"
create_project_field "$PROJECT_ID" "Estimated Hours" "NUMBER"
create_project_field "$PROJECT_ID" "Dependencies" "TEXT"
create_project_field "$PROJECT_ID" "Original Task ID" "TEXT"

echo -e "\n${BLUE}Creating Issue Template...${NC}"
# Create issue template directory
mkdir -p .github/ISSUE_TEMPLATE

# Create agent task template
cat > .github/ISSUE_TEMPLATE/agent-task.md << 'EOF'
---
name: Agent Task
about: Task for multi-agent system
title: 'T[NUMBER]: [DESCRIPTION]'
labels: 'status-ready'
assignees: ''
---

## Task Description
[Clear description of what needs to be done]

## Skills Required
- skill-1
- skill-2

## Dependencies
- Depends on: #[issue-number]
- Blocks: #[issue-number]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Estimated Hours
[X] hours

## Technical Details
[Any additional context, links to specs, etc.]
EOF

echo -e "${GREEN}✓ Created issue template${NC}"

# Create workflow for auto-labeling
echo -e "\n${BLUE}Creating GitHub Actions workflow...${NC}"
mkdir -p .github/workflows

cat > .github/workflows/auto-project.yml << 'EOF'
name: Auto-add issues to project

on:
  issues:
    types: [opened, labeled, unlabeled]

permissions:
  issues: write
  repository-projects: write

jobs:
  add-to-project:
    name: Add issue to project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/users/${{ github.repository_owner }}/projects/${{ secrets.PROJECT_NUMBER }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          labeled: status-ready, status-assigned, status-in-progress, status-blocked, status-review
EOF

echo -e "${GREEN}✓ Created auto-project workflow${NC}"

# Summary
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo "✓ Created 30 labels (8 agents, 4 priorities, 6 statuses, 12 skills)"
echo "✓ Created project '${PROJECT_NAME}' (#${PROJECT_ID})"
echo "✓ Created issue template at .github/ISSUE_TEMPLATE/agent-task.md"
echo "✓ Created GitHub Actions workflow for auto-project assignment"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Visit: https://github.com/${REPO}/labels to review labels"
echo "2. Visit: https://github.com/users/$(gh api user -q .login)/projects/${PROJECT_ID} to configure project board"
echo "3. Add PROJECT_NUMBER=${PROJECT_ID} to repository secrets for automation"
echo "4. Commit the .github directory changes"
echo ""
echo -e "${GREEN}Task T155 complete!${NC}"