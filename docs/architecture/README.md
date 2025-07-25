# Architecture Documentation

This directory contains technical architecture documentation and decision records for the Bulk Grillers Pride system.

## Documents

### Reviews
- [2025-07 Technical Architecture Review](./2025-07-technical-review.md) - Comprehensive system review with performance analysis and recommendations

### Architecture Decision Records (ADRs)
- [ADR-001: Soft Delete Implementation](./decisions/ADR-001-soft-delete.md) - *To be documented*
- [ADR-002: AI Processing Optimization](./decisions/ADR-002-ai-processing-optimization.md) - Event-driven parallel processing architecture
- [ADR-003: Multi-Layer Caching Strategy](./decisions/ADR-003-caching-strategy.md) - Redis and multi-layer caching implementation

## Quick Links
- [Main Architecture Overview](../ARCHITECTURE.md) - System overview and technology stack
- [AI Categorization Performance Report](../AI_CATEGORIZATION_PERFORMANCE_REPORT.md) - Detailed AI performance analysis
- [Testing Architecture](../TESTING.md) - Testing strategy and implementation

## Navigation

### By Topic
- **Performance**: See ADR-002 (AI Processing) and ADR-003 (Caching)
- **Scalability**: See Technical Review sections 5 and recommendations
- **Data Architecture**: See Technical Review section 3 and Main Architecture
- **Security**: See Main Architecture security section

### By Timeline
- **Implemented**: Soft delete system (ADR-001)
- **Proposed**: AI optimization (ADR-002), Caching (ADR-003)
- **Future**: Microservices extraction, Search service

## Contributing
When adding new architecture documentation:
1. Reviews go in the root of this directory with date prefix
2. ADRs go in the `decisions/` subdirectory with sequential numbering
3. Update this README with links to new documents
4. Follow the established templates for consistency