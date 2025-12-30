#!/bin/bash
# Master initialization script
# This script runs all initialization steps:
# 1. Create database
# 2. Create tables
# 3. Run migrations

set -e

echo "=========================================="
echo "PayrollControlDB Full Initialization"
echo "=========================================="

# Run database and table creation
if [ -f "/docker-entrypoint-initdb.d/create-db-and-tables.sh" ]; then
    chmod +x /docker-entrypoint-initdb.d/create-db-and-tables.sh
    /docker-entrypoint-initdb.d/create-db-and-tables.sh
fi

echo ""
echo "Initialization complete!"
echo ""


