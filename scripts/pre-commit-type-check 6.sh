#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running TypeScript type check..."

# Run type check
npm run type-check

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript type check failed!${NC}"
    echo -e "${YELLOW}Please fix the type errors before committing.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ TypeScript type check passed!${NC}"
exit 0