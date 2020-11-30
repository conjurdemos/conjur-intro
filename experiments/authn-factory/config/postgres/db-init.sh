#!/bin/bash
set -e

echo -e "hostssl all all 0.0.0.0/0 cert clientcert=1" > "$PGDATA/pg_hba.conf"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE "application-1" LOGIN;
    CREATE DATABASE "application-1-database";
    GRANT ALL PRIVILEGES ON DATABASE "application-1-database" TO "application-1";

    \c application-1-database

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR,
      email VARCHAR
    );

    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      userId INTEGER REFERENCES users(id),
      title VARCHAR,
      content TEXT,
      image VARCHAR,
      date DATE DEFAULT CURRENT_DATE
    );
EOSQL
