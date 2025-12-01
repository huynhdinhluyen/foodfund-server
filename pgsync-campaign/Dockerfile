FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client for bootstrap check
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install pgsync with binary PostgreSQL adapter
RUN pip install --no-cache-dir pgsync psycopg2-binary

# Copy schema and entrypoint
COPY campaign.schema.json /app/schema.json
COPY entrypoint.sh /app/entrypoint.sh

# Fix line endings and set permissions
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose port for health check
EXPOSE 9090

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
