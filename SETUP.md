# Bulk Grillers Pride - Setup Guide

This guide will help you get the Bulk Grillers Pride application running locally.

## Prerequisites

- Node.js 18+ and npm 9+ (check with `node -v` and `npm -v`)
- Git (for version control and Husky hooks)
- A Convex account (free at https://www.convex.dev)
- A Clerk account (free at https://clerk.com)
- At least one AI provider API key (OpenAI, Anthropic, or Google Gemini)

## Quick Start

### 1. Clone and Install

```bash
# If you haven't already cloned the repo
git clone <repository-url>
cd bulk-grillers-pride

# Install all dependencies
npm install
```

### 2. Set Up Convex Backend

First, we need to set up Convex (our backend/database):

```bash
# This command will open a browser to authenticate
npx convex dev
```

Follow the prompts to:

1. Log in to Convex (or create an account)
2. Create a new project or select an existing one
3. This will create a `.env.local` file in your root directory with your Convex credentials

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Now edit `.env.local` and add your API keys:

1. **Clerk Authentication**:

   - Go to https://dashboard.clerk.com
   - Create a new application (or use existing)
   - Copy your Publishable Key and Secret Key

2. **AI Provider Keys** (you need at least one):
   - **OpenAI**: Get from https://platform.openai.com/api-keys
   - **Anthropic**: Get from https://console.anthropic.com/
   - **Gemini**: Get from https://aistudio.google.com/

### 4. Run the Application

Now you can start the development servers:

```bash
# This runs both Next.js frontend and Convex backend
npm run dev
```

Or run them separately in different terminals:

```bash
# Terminal 1: Convex backend
npx convex dev

# Terminal 2: Next.js frontend
npm run dev:web
```

### 5. Open the Application

Visit http://localhost:3000 in your browser. You should see the login page.

## Troubleshooting

### Common Issues

1. **"CONVEX_DEPLOYMENT not found" error**

   - Make sure you ran `npx convex dev` and selected a project
   - Check that `.env.local` exists in your root directory

2. **"Invalid Clerk publishable key" error**

   - Verify your Clerk keys are correct in `.env.local`
   - Make sure you're using the correct environment (development vs production)

3. **"Cannot connect to Convex" error**

   - Ensure `npx convex dev` is running in a terminal
   - Check that your NEXT_PUBLIC_CONVEX_URL matches your Convex deployment

4. **AI features not working**
   - Verify you have at least one AI provider API key configured
   - Check the browser console for specific error messages

### Verify Your Setup

Run these commands to verify everything is working:

```bash
# Check TypeScript compilation
npm run type-check

# Run tests
npm test

# Check linting
npm run lint
```

## Next Steps

1. Create an account through the sign-up page
2. Create an organization
3. Start uploading products and using the AI categorization features

## Development Commands

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # With coverage

# Type checking
npm run type-check

# Linting
npm run lint

# Clean build artifacts
npm run clean
```

## Project Structure

```
bulk-grillers-pride/
├── apps/web/          # Next.js frontend application
├── convex/            # Convex backend functions and schema
├── .claude/           # Multi-agent AI configuration
├── .locks/            # File locking for multi-agent coordination
└── package.json       # Root package configuration
```

## Need Help?

- Check the agent system documentation in `ORCHESTRATOR.md`
- Review individual agent capabilities in their `CLAUDE.md` files
- For AI issues, check the console for specific provider error messages
