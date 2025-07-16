# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites

- Node.js v18+ and npm v9+
- A Clerk account (free tier works)
- A Convex account (free tier works)

### 1. Clone and Setup (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd bulk-grillers-pride

# Run the interactive setup
npm run setup
```

The setup script will:

- ✅ Check your Node.js and npm versions
- ✅ Help you configure environment variables
- ✅ Install all dependencies
- ✅ Set up Convex database
- ✅ Run initial verification checks

### 2. Get Your API Keys (2 minutes)

#### Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Copy your API keys from the dashboard

#### Convex (Database)

1. Go to [convex.dev](https://convex.dev) and sign up
2. Create a new project
3. Copy your deployment URL

### 3. Start Development (1 minute)

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:web    # Next.js frontend
npm run dev:convex # Convex backend
```

### 4. Access Your App

- 🌐 Web App: http://localhost:3000
- 📊 Convex Dashboard: https://dashboard.convex.dev

## 🎯 What's Next?

1. **Sign up** in the app to create your first organization
2. **Import categories** using the migration tool
3. **Add products** and test AI categorization
4. **Check tasks** in AGENTS_BOARD.md for development work

## 🆘 Troubleshooting

### Common Issues

**Environment variables not working?**

- Make sure `.env.local` exists in both root and `apps/web/`
- Restart the dev server after changing env vars

**Convex setup fails?**

- Check your NEXT_PUBLIC_CONVEX_URL is correct
- Make sure you're logged in: `npx convex login`

**Type errors?**

- Run `npm run type-check` to see all issues
- Convex types are auto-generated, wait for initial sync

### Need Help?

- Check `docs/` folder for detailed guides
- Review `AGENTS_BOARD.md` for known issues
- Run `npm test` to verify your setup

## 📝 Manual Setup (Alternative)

If the automated setup doesn't work:

1. Copy `.env.example` to `.env.local`
2. Fill in your API keys
3. Run these commands:

```bash
npm install
npm run convex:setup
npm run dev
```
