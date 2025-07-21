#!/bin/bash
# Fix all /check-tasks references in CLAUDE*.md files

echo "Updating /check-tasks references in CLAUDE*.md files..."

# Update root level CLAUDE files
for file in CLAUDE-quality.md CLAUDE-systems-design.md CLAUDE-migration.md CLAUDE-design.md CLAUDE-docs.md; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    sed -i.bak 's|Run `/check-tasks`|Run `npm run check-tasks`|g' "$file"
    sed -i.bak 's|Always run `/check-tasks`|Always run `npm run check-tasks`|g' "$file"
  fi
done

# Update special references
if [ -f "convex/CLAUDE.md" ]; then
  echo "Updating convex/CLAUDE.md..."
  sed -i.bak 's|node ../scripts/check-tasks|cd .. \&\& npm run check-tasks|g' "convex/CLAUDE.md"
fi

if [ -f "apps/web/CLAUDE.md" ]; then
  echo "Updating apps/web/CLAUDE.md..."
  sed -i.bak 's|node ../../scripts/check-tasks|cd ../.. \&\& npm run check-tasks|g' "apps/web/CLAUDE.md"
fi

echo "Done! All /check-tasks references have been updated."
echo "Backup files created with .bak extension"