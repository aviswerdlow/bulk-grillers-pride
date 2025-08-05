# Bulk Grillers Pride

A multi-tenant SaaS application for e-commerce product merchandising with AI-powered categorization.

## 🚀 Features

- **Multi-Tenant Architecture**: Secure organization-based data isolation
- **AI-Powered Categorization**: Automatic product categorization using OpenAI, Anthropic, or Google Gemini
- **Real-Time Updates**: Powered by Convex for instant data synchronization
- **Hierarchical Categories**: Complex category trees with unlimited depth
- **Bulk Operations**: Import and manage thousands of products efficiently
- **Role-Based Access Control**: Granular permissions for team members
- **Modern UI**: Built with Next.js 14 and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend**: Convex (serverless functions + real-time database)
- **Authentication**: Clerk
- **AI Integration**: OpenAI, Anthropic, Google Gemini
- **Build System**: Turbo v2 (40-60% faster builds with remote caching)
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions, Vercel

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- Git
- Convex account (free tier available)
- Clerk account (free tier available)
- At least one AI provider API key (OpenAI, Anthropic, or Google Gemini)

## 🔧 Build Requirements

This project uses npm workspaces and requires a complete dependency installation before building:

```bash
# Install all dependencies including build tools
npm install

# The build system uses tsup for TypeScript compilation
# tsup is installed as a root dependency and shared across all packages
```

**Important**: Always run `npm install` after cloning or pulling changes to ensure all build dependencies are available.

## 🚀 Quick Start

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd bulk-grillers-pride
   npm run setup
   ```

2. **Configure Environment**

   - The setup script will guide you through configuring your API keys
   - Or manually copy `.env.example` to `.env.local` and add your keys

3. **Start Development**

   ```bash
   npm run dev
   ```

4. **Open Application**
   - Visit http://localhost:3000
   - Sign up to create your first organization

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md) or [SETUP.md](./SETUP.md).

## 🏗️ Project Structure

```
bulk-grillers-pride/
├── apps/
│   └── web/              # Next.js frontend application
├── convex/               # Backend functions and database schema
│   ├── functions/        # Serverless functions
│   │   ├── auth/        # Authentication and permissions
│   │   ├── categories/  # Category management
│   │   └── products/    # Product operations
│   └── schema.ts        # Database schema definition
├── docs/                # Documentation
├── e2e/                 # End-to-end tests
├── scripts/             # Build and setup scripts
└── .locks/              # Multi-agent coordination locks
```

## 📚 Documentation

- [Quick Start Guide](./QUICKSTART.md) - Get up and running in 5 minutes
- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Testing Guide](./docs/TESTING.md) - How to write and run tests
- [CI/CD Documentation](./docs/CI_CD.md) - Continuous integration setup
- [Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) - Production deployment

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:web         # Start frontend only
npm run dev:convex      # Start backend only

# Testing
npm test                # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Run end-to-end tests

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Check TypeScript types
npm run validate:clerk  # Validate Clerk JWT configuration

# Build & Deploy
npm run build           # Build for production
npm run convex:deploy   # Deploy Convex backend
```

### Multi-Agent Development System

This project uses a multi-agent AI system for development coordination:

- **frontend-agent**: React/Next.js development
- **backend-agent**: Convex backend development
- **infra-agent**: Build tools and CI/CD
- **quality-agent**: Testing and code review
- **docs-agent**: Documentation maintenance
- **migration-agent**: Schema and data migrations

Use GitHub Issues for task tracking and the `/check-tasks` command for coordination.

## 🔧 Configuration

### Environment Variables

| Variable                            | Description           | Required   |
| ----------------------------------- | --------------------- | ---------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key      | Yes        |
| `CLERK_SECRET_KEY`                  | Clerk secret key      | Yes        |
| `CLERK_ISSUER_URL`                  | Clerk JWT issuer URL  | Yes        |
| `NEXT_PUBLIC_CONVEX_URL`            | Convex deployment URL | Yes        |
| `OPENAI_API_KEY`                    | OpenAI API key        | Optional\* |
| `ANTHROPIC_API_KEY`                 | Anthropic API key     | Optional\* |

\*At least one AI provider key is required for categorization features.

## 🚀 Deployment

The application is configured for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with `git push` to main branch

See [Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

1. Check GitHub Issues for available tasks or use `/check-tasks` command
2. Follow the agent system for coordinated development
3. Write tests for new features
4. Ensure all tests pass before submitting

## 🛡️ Security

- Authentication handled by Clerk with JWT tokens
- Row-level security enforced by Convex
- API keys stored securely as environment variables
- Regular dependency updates via Dependabot

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- Check documentation in the `docs/` folder
- Review GitHub Issues for known issues and active work
- Run `npm test` to verify your setup

---

Built with ❤️ by the Bulk Grillers Pride team
