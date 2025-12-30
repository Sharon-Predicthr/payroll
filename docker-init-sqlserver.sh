#!/bin/bash
# Script to initialize SQL Server database and tables
# This runs after SQL Server container is healthy

echo "Initializing PayrollControlDB database and tables..."

# Wait for SQL Server to be healthy
echo "Waiting for SQL Server to be ready..."
sleep 30

# Run initialization script
docker exec payroll-sqlserver bash -c "chmod +x /docker-entrypoint-initdb.d/create-db-and-tables.sh && /docker-entrypoint-initdb.d/create-db-and-tables.sh"

echo "Initialization complete!"


