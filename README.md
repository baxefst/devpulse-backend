# DevPulse Backend

Production-ready backend for **DevPulse** — a "Proof of Execution" platform where builders post public records of shipped milestones.

## Tech Stack

- **Runtime**: Node.js 22 + TypeScript
- **Framework**: Hono + @hono/node-server
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Auth**: JWT (jose) + bcrypt
- **Validation**: Zod
- **Cron**: node-cron
- **Container**: Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 22+
- Docker & Docker Compose

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the values:
   ```bash
   cp .env.example .env
   ```

### Development

Run the development server with hot-reload:
```bash
npm run dev
```

### Docker

Spin up the entire stack (app + database):
```bash
docker-compose up --build
```

## API Routes

### Auth
- `POST /api/v1/auth/register` - Register a new account
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Invalidate refresh token

### Users
- `GET /api/v1/users/:username` - Public profile
- `PATCH /api/v1/users/me` - Update own profile (Auth required)
- `GET /api/v1/users/me/stats` - Personal reputation stats (Auth required)

### Drops
- `GET /api/v1/drops` - List drops (Paginated, Searchable)
- `POST /api/v1/drops` - Create a new drop (Auth required)
- `GET /api/v1/drops/:id` - Get drop details
- `PATCH /api/v1/drops/:id` - Update drop (Owner only)
- `DELETE /api/v1/drops/:id` - Soft delete drop (Owner only)

### Milestones
- `POST /api/v1/drops/:dropId/milestones` - Add milestone (Owner only)
- `PATCH /api/v1/milestones/:id` - Edit milestone (Owner only)
- `POST /api/v1/milestones/:id/proof` - Submit proof (Owner only)

### Leaderboard
- `GET /api/v1/leaderboard` - Public ranked leaderboard
