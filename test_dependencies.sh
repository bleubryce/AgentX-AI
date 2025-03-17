#!/bin/bash

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing dependencies...${NC}"

# Test backend dependencies
echo -e "\n${YELLOW}Testing backend dependencies...${NC}"
if python src/backend/tests/test_dependencies.py; then
    echo -e "${GREEN}Backend dependency tests passed!${NC}"
else
    echo -e "${RED}Backend dependency tests failed!${NC}"
    exit 1
fi

# Test frontend dependencies
echo -e "\n${YELLOW}Testing frontend dependencies...${NC}"
echo "Note: This will only check if the dependencies are installed, not if they work correctly."
echo "To fully test frontend dependencies, run 'npm test'."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}Node modules directory exists.${NC}"
else
    echo -e "${RED}Node modules directory does not exist. Run 'npm install' first.${NC}"
    exit 1
fi

# Check for key dependencies
DEPS=("react" "react-dom" "axios" "react-query" "recharts" "@mui/material" "@mui/x-date-pickers")
MISSING=0

for DEP in "${DEPS[@]}"; do
    if [ -d "node_modules/$DEP" ]; then
        echo -e "${GREEN}✓ $DEP${NC}"
    else
        echo -e "${RED}✗ $DEP${NC}"
        MISSING=1
    fi
done

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}All frontend dependencies are installed!${NC}"
else
    echo -e "${RED}Some frontend dependencies are missing. Run 'npm install' to install them.${NC}"
    exit 1
fi

echo -e "\n${GREEN}All dependency tests passed!${NC}"
echo "You can now run the application." 