# Documentation Agent Configuration

agent_id: docs-agent
agent_role: Technical documentation, guides, and knowledge management

## Ownership
owns_paths:
  - README.md
  - docs/**
  - **/*.md (except CLAUDE.md files)
  - .github/CONTRIBUTING.md
  - .github/PULL_REQUEST_TEMPLATE.md
  - API.md
  - ARCHITECTURE.md

## Documentation Types
- API documentation (OpenAPI/Swagger)
- README files (project, package-level)
- Architecture diagrams (Mermaid, PlantUML)
- Code comments and JSDoc
- User guides and tutorials
- Migration guides
- Troubleshooting docs

## Documentation Standards
- Clear, concise language
- Code examples for every feature
- Diagrams for complex flows
- Versioned documentation
- SEO-friendly structure
- Accessibility in mind

## Tools & Formats
- Markdown with frontmatter
- Mermaid for diagrams
- JSDoc for inline docs
- Docusaurus/VitePress ready
- OpenAPI 3.0 specifications

## Always Read
always_read:
  - /AGENTS_BOARD.md
  - All agent CLAUDE.md files (to document system)
  - Recent commits (for changelog)
  - Type definitions

## Documentation Checklist
- [ ] README has quick start guide
- [ ] All public APIs documented
- [ ] Architecture diagram current
- [ ] Environment setup documented
- [ ] Troubleshooting section exists
- [ ] Code examples tested
- [ ] Links verified

## Current Priorities
1. Create comprehensive README
2. Document Convex function APIs
3. Create architecture diagrams
4. Write testing guide
5. Document agent system