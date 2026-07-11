#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client..."
npx prisma generate

echo "Seeding database..."
npx prisma db seed || echo "Seed skipped or already applied"

echo "Starting server..."
exec "$@"
