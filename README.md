# YTB Tracker

**YTB** = **Yesterday / Today / Blockers**. This project will be a small web app to capture daily stand-up notes per project, browse history, and copy a Slack-friendly summary to the clipboard.

## Planned v1 features

- Email + password authentication
- CRUD projects (name + optional color/icon)
- One YTB entry per project per date (Markdown for Yesterday/Today/Blockers)
- “Copy from yesterday” (previous day’s **Today** → current day’s **Yesterday**)
- Browse entries by date range
- One-click copy to clipboard in Slack-friendly format

## Status

Early scaffold / WIP.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose

### Database Setup

The project uses **PostgreSQL 16** with **Prisma ORM**.

1. **Copy environment file**

   ```bash
   cp .env.example .env
   ```

   Default credentials are pre-configured for local development.

2. **Start the database**

   ```bash
   docker-compose up -d
   ```

   This starts a PostgreSQL container (`ytb-postgres`) on port 5432.

3. **Run migrations**

   ```bash
   npm run db:migrate
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

### Database Commands

| Command                     | Description                             |
| --------------------------- | --------------------------------------- |
| `npm run db:migrate`        | Apply pending migrations                |
| `npm run db:migrate:create` | Create a new migration without applying |
| `npm run db:migrate:deploy` | Deploy migrations (production)          |
| `npm run db:migrate:status` | Check migration status                  |
| `npm run db:generate`       | Regenerate Prisma client                |

### Stopping the Database

```bash
docker-compose down
```

To remove the data volume as well:

```bash
docker-compose down -v
```
