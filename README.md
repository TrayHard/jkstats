# JKStats

A monorepo for tracking Jedi Academy activity stats.

## Structure

- `packages/front` — Frontend (Vite + Vue 3 + TypeScript)
- `packages/back` — Backend (Fastify + Mongoose + TypeScript)
- `packages/core` — Shared types (TypeScript)

## Getting Started

1. Install [pnpm](https://pnpm.io/):
   ```sh
   npm install -g pnpm
   ```
2. Install dependencies:
   ```sh
   pnpm install
   ```
3. Build shared types:
   ```sh
   pnpm --filter @jkstats/core build
   ```
4. Run backend:
   ```sh
   pnpm --filter @jkstats/back dev
   ```
5. Run frontend:
   ```sh
   pnpm --filter @jkstats/front dev
   ```

## About

JKStats is a website for tracking player and match activity in Jedi Academy. 