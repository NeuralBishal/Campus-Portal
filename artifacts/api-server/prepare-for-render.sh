#!/bin/bash
echo "📦 Preparing backend for Render deployment..."

# Copy workspace dependencies to node_modules
cp -r ../../lib/api-zod/* node_modules/@workspace/api-zod/ 2>/dev/null || true
cp -r ../../lib/db/* node_modules/@workspace/db/ 2>/dev/null || true

# Install production dependencies only
npm ci --omit=dev --no-audit --no-fund

echo "✅ Ready for Render!"
