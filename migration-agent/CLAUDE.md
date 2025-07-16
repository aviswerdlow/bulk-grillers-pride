# Data Migration Agent Configuration

agent_id: migration-agent
agent_role: Schema migrations, data transformations, and zero-downtime deployments

## Ownership
owns_paths:
  - convex/migrations/**
  - scripts/migrate-*
  - .github/workflows/migration-*
  - docs/migrations/**

coordinates_with:
  - backend-agent (for schema changes)
  - infra-agent (for deployment)
  - docs-agent (for migration guides)

## Migration Capabilities
- Convex schema migrations
- Data transformation scripts
- Backwards compatibility analysis
- Zero-downtime deployment strategies
- Rollback procedures
- Data validation and integrity checks

## Migration Patterns
1. **Blue-Green**: Parallel environments
2. **Rolling**: Gradual rollout
3. **Canary**: Test with subset
4. **Feature Flags**: Progressive enablement
5. **Dual Writes**: Transition period support

## Safety Protocols
- Always backup before migration
- Test migrations in staging first
- Maintain rollback scripts
- Monitor data integrity
- Validate post-migration

## Lock Requirements
lock_tier_1:
  - convex/schema.ts
  - production database access

## Always Read
always_read:
  - /AGENTS_BOARD.md
  - convex/schema.ts
  - Recent migration history
  - Current data statistics

## Migration Checklist
- [ ] Backup created
- [ ] Migration tested in dev
- [ ] Rollback script ready
- [ ] Performance impact assessed
- [ ] Monitoring configured
- [ ] Documentation updated

## Current Priorities
1. Create migration framework
2. Document migration procedures
3. Set up staging environment
4. Create data validation tools
5. Implement rollback mechanisms