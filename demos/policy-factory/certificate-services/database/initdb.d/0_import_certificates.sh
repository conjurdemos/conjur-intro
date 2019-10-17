#!/bin/bash
set -e

# Store server SSL key material
echo "$SERVER_CERT" > "$PGDATA/server.crt"
echo "$SERVER_KEY" > "$PGDATA/server.key"
chmod 0600 "$PGDATA/server.key"

# Store CA cert for database clients
echo "$CLIENTS_CA_CERT" > "$PGDATA/clients.crt"

# Configure SSL
sed -i -e"s/^#ssl = .*$/ssl = on/" "$PGDATA/postgresql.conf"
sed -i -e"s/^#ssl_ca_file = .*$/ssl_ca_file = 'clients.crt'/" "$PGDATA/postgresql.conf"

# Configure certificate authentication
sed -i '/^host all all all trust/d' "$PGDATA/pg_hba.conf"
echo "hostnossl all all all reject" >> "$PGDATA/pg_hba.conf"
echo "hostssl all all all cert map=cert" >> "$PGDATA/pg_hba.conf"

# Add cert user mapping
echo 'cert            /^(.*)$                 \1' >> "$PGDATA/pg_ident.conf"
