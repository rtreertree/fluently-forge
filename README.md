# Fluently Forge

An AI-powered language-learning web app. Learners hold realtime voice conversations with an AI tutor, track their daily activity streak, and manage their own account and settings.

> **Security notice:** Never commit API keys or secrets. All credentials must live in environment variables (`.env`, which is git-ignored). If a key was ever committed, **rotate it** and remove it from git history.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started (Local)](#getting-started-local)
5. [Environment Variables](#environment-variables)
6. [Database (Prisma)](#database-prisma)
7. [Running with Docker](#running-with-docker)
8. [Production Deployment (VPS + Nginx + SSL)](#production-deployment-vps--nginx--ssl)
9. [Cost Notes (OpenAI Realtime API)](#cost-notes-openai-realtime-api)
10. [Development Guidelines](#development-guidelines)
11. [Git Workflow](#git-workflow)
12. [Troubleshooting](#troubleshooting)

---

## Features

| Feature         | Route             | Description                                                      | Status      |
| --------------- | ----------------- | ---------------------------------------------------------------- | ----------- |
| Welcome page    | `/`               | Landing page with information about the project                  | Not started |
| Home dashboard  | `/dashboard`      | Central hub showing sessions, streak and progress                | Not started |
| Login/Register  | `/login`          | Account creation, authentication and database integration        | 50%         |
| Session creator | `/create-session` | Create and configure a practice session                          | Not started |
| Daily streak    | -                 | Counts and displays user activity day by day                     | In progress |
| Account setting | `/setting`        | Account and user preferences                                     | In progress |

> Route names other than those listed in the original feature list are suggestions; adjust to match `routes.ts`.

---

## Tech Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Framework        | [Next.js](https://nextjs.org/) (App Router)          |
| Language         | TypeScript                                           |
| Styling          | Tailwind CSS, PostCSS                                |
| UI components    | shadcn/ui (configured in `components.json`)          |
| Authentication   | Auth.js / NextAuth (`auth.ts`, `auth.config.ts`)     |
| ORM              | Prisma                                               |
| AI               | OpenAI Realtime API, `gpt-4o-mini` model (voice)     |
| Validation       | Schemas in `schemas/`                                |
| Linting          | ESLint (`eslint.config.mjs`)                         |
| Containerization | Docker (multi-stage, `node:24-alpine`), Docker Compose |
| CI/CD            | GitHub Actions (`.github/workflows`)                 |

---

## Project Structure

```
fluently-forge/
├── .github/workflows/   # CI/CD pipelines
├── actions/             # Server actions
├── app/                 # Next.js App Router pages, layouts, API routes
├── components/          # Reusable UI components
├── data/                # Data-access helpers / static data
├── hooks/               # Custom React hooks
├── lib/                 # Shared utilities and clients
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets
├── schemas/             # Validation schemas
├── auth.ts              # Auth.js main configuration
├── auth.config.ts       # Auth.js edge-compatible configuration
├── middleware.ts        # Route protection / redirects
├── routes.ts            # Public, auth and protected route lists
├── next.config.ts       # Next.js configuration
├── tailwind.config.ts   # Tailwind configuration
├── Dockerfile           # Production image
├── compose.yaml         # Docker Compose services
└── README.Docker.md     # Docker-specific notes
```

---

## Getting Started (Local)

### Prerequisites

- Node.js 20+ (the Docker image uses Node 24)
- npm
- A database supported by your Prisma schema (check `prisma/schema.prisma`)
- An OpenAI API key with Realtime API access

### Steps

```bash
# 1. Clone
git clone https://github.com/rtreertree/fluently-forge.git
cd fluently-forge

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env      # if no example file exists, create .env manually
# then fill in the values (see below)

# 4. Generate the Prisma client and sync the schema
npx prisma generate
npx prisma db push

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

### Useful scripts

| Command         | Purpose                         |
| --------------- | ------------------------------- |
| `npm run dev`   | Start the development server    |
| `npm run build` | Create a production build       |
| `npm start`     | Run the production build        |
| `npm run lint`  | Run ESLint                      |

---

## Environment Variables

Create a `.env` file in the project root. Exact names depend on the code; verify against `auth.ts`, `lib/` and `prisma/schema.prisma`.

```env
# Database
DATABASE_URL="<your database connection string>"

# Auth.js
AUTH_SECRET="<generate with: npx auth secret  or  openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"      # https://your-domain.com in production
AUTH_TRUST_HOST=true                  # required behind a reverse proxy

# OpenAI
OPENAI_API_KEY="<your key>"
```

Never commit `.env`. Share secrets through a password manager or your hosting provider's secret store.

---

## Database (Prisma)

After changing `prisma/schema.prisma`, run:

```bash
npx prisma generate   # regenerate the client
npx prisma db push    # push schema changes to the database
```

Optional: browse data with `npx prisma studio`.

---

## Running with Docker

The `Dockerfile` uses a two-stage build:

1. **builder:** installs dependencies, runs `prisma generate`, builds Next.js, prunes dev dependencies
2. **runner:** copies only `node_modules`, `.next`, `public` and `package.json`, then runs `npm start` on port **3000**

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

To apply schema changes inside the container:

```bash
docker compose exec <app-service-name> npx prisma db push
```

> `npm prune --production` removes the Prisma CLI. If `db push` fails inside the container, run it from the host or from a separate one-off container with dev dependencies.

See `README.Docker.md` for more details.

---

## Production Deployment (VPS + Nginx + SSL)

### 1. Prepare the server

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

### 2. Deploy the app

```bash
git clone https://github.com/rtreertree/fluently-forge.git && cd fluently-forge
nano .env     # production values, AUTH_URL=https://your-domain.com
docker compose up -d --build
```

Bind the app to localhost only (in `compose.yaml`: `"127.0.0.1:3000:3000"`) so it is reachable only through Nginx. Do not expose the database port publicly.

### 3. Nginx reverse proxy

`/etc/nginx/sites-available/fluently-forge`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fluently-forge /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run     # verify auto-renewal
```

HTTPS is **required** for microphone access, so voice features only work once SSL is active.

### 5. Updating

```bash
git pull origin main
docker compose up -d --build
```

---

## Cost Notes (OpenAI Realtime API)

Sample usage for **10 minutes** of conversation with `gpt-4o-mini` realtime:

| Token type           | Tokens  | Price                          | Total (USD) |
| -------------------- | ------- | ------------------------------ | ----------- |
| Input audio          | 27,000  | $0.60 / 1M input tokens        | 0.0162      |
| Input audio (cached) | 91,392  | $0.30 / 1M cached input tokens | 0.2742      |
| Input text           | 6,350   | $10.00 / 1M input tokens       | 0.0635      |
| Input text (cached)  | 21,888  | $0.30 / 1M cached input tokens | 0.0066      |
| Output audio         | 11,000  | $20.00 / 1M output tokens      | 0.2200      |
| Output text          | 2,816   | $2.40 / 1M output tokens       | 0.0067      |
|                      |         | **Total**                      | **0.5872**  |

Roughly **$0.06 per minute**. Consider session time limits and per-user usage caps before public launch. Pricing may change; check OpenAI's pricing page.

---

## Development Guidelines

### 1. Stay updated with the remote

Before starting work:

```bash
git pull origin main
```

### 2. Use feature branches

Branch from the latest `main`, named `feature/<feature-name>` or `fix/<bug-description>`:

```bash
git checkout -b feature/user-session
```

Push when done and open a pull request.

### 3. Document with JSDoc

Use JSDoc where possible; simple comments are acceptable.

```ts
/**
 * Adds two numbers and returns the result.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} Sum of a and b.
 */
function addNumbers(a: number, b: number): number {
  return a + b;
}
```

### 4. Build reusable components

- Keep components modular and maintainable
- Follow DRY (Don't Repeat Yourself)
- Use props, hooks and context for flexibility

### 5. Keep secrets out of git

Use `.env`, never hard-code keys, and check `git diff` before every commit.

---

## Git Workflow

1. Create a branch from `main`: `git checkout -b <branch-name>`
2. Make changes and commit regularly
3. Push the branch to the remote
4. Open a Pull Request on GitHub
5. Request a code review
6. Pull the merged changes into your local `main`
7. Repeat


---

## Troubleshooting

| Problem                              | Likely cause / fix                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Login redirects to wrong URL         | Set `AUTH_URL` to your public HTTPS URL and `AUTH_TRUST_HOST=true`              |
| Microphone does not work             | Site is not served over HTTPS, or browser permission was denied                 |
| `502 Bad Gateway` from Nginx         | App container not running or not on `127.0.0.1:3000` (`docker compose ps`)     |
| Prisma client errors after schema edit | Run `npx prisma generate` then `npx prisma db push`                           |
| Realtime connection drops            | Check Nginx `Upgrade`/`Connection` headers and `proxy_read_timeout`             |
| Build fails in Docker                | Ensure `package-lock.json` is committed and `DATABASE_URL` is available at build if needed |
