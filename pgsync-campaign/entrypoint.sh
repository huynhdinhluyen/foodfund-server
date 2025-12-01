#!/bin/bash
set -e

echo "Starting PGSync for campaign_db..."

# Check if bootstrap is needed (check if pgsync schema exists)
echo "Checking if bootstrap is needed..."
BOOTSTRAP_CHECK=$(PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgsync');" 2>/dev/null || echo "false")

if [ "$BOOTSTRAP_CHECK" = "f" ] || [ "$BOOTSTRAP_CHECK" = "false" ]; then
    echo "Bootstrap needed. Running bootstrap..."
    bootstrap --config /app/schema.json
    echo "Bootstrap completed!"
else
    echo "Bootstrap already done. Skipping..."
fi

# Start PGSync daemon
echo "Starting PGSync daemon..."
exec pgsync --config /app/schema.json --daemon
