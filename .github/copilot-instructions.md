# BotlLab Copilot Instructions

This document provides guidance for AI coding agents to effectively contribute to the BotlLab codebase.

## 1. High-Level Architecture

The BotlLab application is a full-stack Next.js application with a Supabase backend.

- **Frontend**: Built with Next.js App Router, TypeScript, and Tailwind CSS. Key UI components are in `app/components/`.
- **Backend**: Supabase handles the database and authentication. Business logic is implemented in Supabase Edge Functions (Deno runtime), located in `supabase/functions/`.
- **Database**: The PostgreSQL database schema is managed with migration files in `supabase/migrations/`. Seeding is done via `supabase/seed.sql`.
- **Analytics**: A core feature of the application is analytics processing. Raw events are stored and then aggregated by the `aggregate-analytics` function in `supabase/functions/aggregate-analytics/index.ts`. This function is invoked on a schedule to populate daily and hourly summary tables.

## 2. Supabase Integration

- **Client-side**: The Supabase client for client-side queries is initialized in `lib/supabase.ts`.
- **Server-side**: For server components and Route Handlers, a server-side client is created in `lib/supabase-server.ts`. Always use this for server-side data fetching and mutations to ensure proper authentication and security.
- **Types**: Database types are generated from the Supabase schema and are available in `lib/database.types.ts`. Use these types to ensure type safety when working with data from Supabase.

## 3. Key Workflows & Conventions

### Authentication

- Authentication is handled by Supabase Auth. The UI for this is in `app/auth/`.
- Middleware in `middleware.ts` protects routes and handles redirects for unauthenticated users.

### Data Flow for Analytics

1.  **Event Logging**: Client-side events are sent to the `analytics_events` table.
2.  **Aggregation**: The `aggregate-analytics` Supabase function runs periodically. It reads from `analytics_events` and computes daily/hourly summaries, storing them in tables like `analytics_user_daily`, `analytics_brewery_daily`, etc.
3.  **Display**: The frontend reads from these aggregated tables to display analytics dashboards, which can be found in `app/dashboard/`.

When working on analytics, you will likely need to touch all three parts of this flow.

### Background Jobs

- Supabase Edge Functions are used for background jobs like analytics aggregation. When creating a new background job, create a new function in the `supabase/functions/` directory.

### Environment Variables

- The application relies on environment variables defined in `.env.local`. Make sure to have a properly configured `.env.local` file based on `.env.example` (if present). These include Supabase URL and keys.

## 4. How to run tests

- There are no conventional unit or integration tests set up in the project.
- Testing seems to be done via SQL scripts (`test_analytics.sql`) and standalone JS scripts (`test_analytics.js`). When adding new features, consider adding a corresponding test script.

## 5. Coding Style

- The project uses ESLint for code linting. Please adhere to the rules defined in `eslint.config.mjs`.
- TypeScript is used throughout the project. Make use of the generated Supabase types for database operations.
