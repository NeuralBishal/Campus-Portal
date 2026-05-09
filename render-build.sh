#!/bin/bash
# Install pnpm
npm install -g pnpm

# Install dependencies from root
pnpm install --no-frozen-lockfile

# Build frontend
cd artifacts/campus-portal
pnpm run build
