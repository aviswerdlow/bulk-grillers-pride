#!/bin/bash
# Update AGENTS_BOARD.md with completed migration tasks

# Update all completed tasks
sed -i.bak \
    -e 's/| T156 |.*unassigned.*| T155 |/| T156 | Create issue templates and automation | github-api, yaml | migration-agent | ✔️ done | T155 | P0 | 2 |/' \
    -e 's/| T157 |.*in-progress.*| - |/| T157 | Develop board parser script | python, parsing, regex | migration-agent | ✔️ done | - | P0 | 3 |/' \
    -e 's/| T158 |.*unassigned.*| T157 |/| T158 | Build GitHub issue creator script | python, github-api | migration-agent | ✔️ done | T157 | P0 | 3 |/' \
    -e 's/| T159 |.*unassigned.*| T157,T158 |/| T159 | Create bidirectional sync system | bash, python, data-sync | migration-agent | ✔️ done | T157,T158 | P0 | 2 |/' \
    -e 's/| T160 |.*unassigned.*| T159 |/| T160 | Create task wrapper library | bash, scripting | migration-agent | ✔️ done | T159 | P0 | 3 |/' \
    -e 's/| T161 |.*unassigned.*| T160 |/| T161 | Update agent instruction templates | documentation, markdown | migration-agent | ✔️ done | T160 | P1 | 2 |/' \
    -e 's/| T162 |.*unassigned.*| T158 |/| T162 | Build task ID mapping database | json, data-migration | migration-agent | ✔️ done | T158 | P1 | 3 |/' \
    -e 's/| T163 |.*unassigned.*| T157,T158 |/| T163 | Write unit tests for migration scripts | python, testing, pytest | migration-agent | ✔️ done | T157,T158 | P1 | 3 |/' \
    -e 's/| T164 |.*unassigned.*| T159,T160 |/| T164 | Create integration test suite | bash, testing | migration-agent | ✔️ done | T159,T160 | P1 | 3 |/' \
    -e 's/| T168 |.*unassigned.*| T161 |/| T168 | Update all agent CLAUDE.md files | documentation, scripting | migration-agent | ✔️ done | T161 | P0 | 2 |/' \
    -e 's/| T170 |.*unassigned.*| T159 |/| T170 | Create rollback procedure | scripting, testing | migration-agent | ✔️ done | T159 | P0 | 1 |/' \
    AGENTS_BOARD.md

echo "Updated AGENTS_BOARD.md with completed migration tasks"