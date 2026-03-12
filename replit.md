# Astryón Bulk Real Estate Listing Ops

## Overview

A professional SaaS platform for real estate agents and agencies that automatically generates bulk real estate listing descriptions using AI. Built as a full-stack monorepo with React + Vite frontend, Express 5 backend, PostgreSQL database, and Groq/OpenAI AI integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, Zustand, wouter)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Groq SDK (primary), OpenAI (optional upgrade)
- **Payments**: Paddle

## Key Features

1. **Authentication** - JWT-based login/register with bcrypt password hashing
2. **Subscription Plans** - Starter (€49/60 credits), Pro (€129/200 credits), Agency (€299/600 credits)
3. **CSV Upload & Bulk AI Generation** - Parse CSV client-side with PapaParse, send to API, generate with Groq
4. **Export** - Download generated listings as CSV
5. **Credit System** - Server-side enforced, resets monthly via Paddle webhooks
6. **Admin Panel** - User management, credit adjustments, AI provider switching, feedback, webhook logs
7. **Feedback System** - Submit feedback from dashboard
8. **Legal Pages** - Privacy, Terms, Refund at /privacy, /terms, /refund

## Required Environment Variables / Secrets

Set these in the Secrets tab:

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for AI generation (primary) |
| `OPENAI_API_KEY` | OpenAI API key (optional, for Pro/Agency upgrade) |
| `JWT_SECRET` | Secret for signing JWT tokens (generate a random string) |
| `PADDLE_VENDOR_ID` | Your Paddle vendor ID |
| `PADDLE_API_KEY` | Your Paddle API key |
| `PADDLE_PUBLIC_KEY` | Your Paddle public key for webhook verification |
| `PADDLE_PRODUCT_STARTER` | Paddle product ID for Starter plan |
| `PADDLE_PRODUCT_PRO` | Paddle product ID for Pro plan |
| `PADDLE_PRODUCT_AGENCY` | Paddle product ID for Agency plan |

Set these as env vars (already configured):

| Variable | Value |
|---|---|
| `MODEL_PROVIDER` | `groq` |
| `AI_MODEL_NAME` | `llama-3.1-70b-versatile` |
| `STARTER_PROVIDER` | `groq` |
| `PRO_PROVIDER` | `groq` |
| `AGENCY_PROVIDER` | `groq` |

## Paddle Setup Steps

1. Create a Paddle account at paddle.com
2. Create 3 subscription products: Starter (€49/mo), Pro (€129/mo), Agency (€299/mo)
3. Copy the product IDs into secrets: `PADDLE_PRODUCT_STARTER`, `PADDLE_PRODUCT_PRO`, `PADDLE_PRODUCT_AGENCY`
4. Set your webhook endpoint to: `https://yourdomain.com/api/webhooks/paddle`
5. Paddle will handle credit resets via `subscription_payment_succeeded` webhook events

## AI Provider Setup & Switching

**Current configuration**: All plans use Groq (`llama-3.1-70b-versatile`)

**To switch providers after first paying user**:
1. Go to the Admin Panel → Settings tab
2. Change Pro Provider and Agency Provider to `openai`
3. Ensure `OPENAI_API_KEY` secret is set

**Environment variable control** (alternative):
- Set `PRO_PROVIDER=openai` and `AGENCY_PROVIDER=openai` in env vars
- Set `AI_MODEL_NAME=gpt-4o-mini` for OpenAI

## Creating Admin User

After registering an account, run this SQL to make a user admin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   └── src/
│   │       ├── lib/auth.ts    # JWT auth + middleware
│   │       ├── lib/ai.ts      # AI generation service (Groq/OpenAI)
│   │       └── routes/        # API route handlers
│   └── astryon/            # React + Vite frontend
│       └── src/
│           ├── pages/         # All page components
│           ├── components/    # Shared UI components
│           └── lib/           # Utils, store
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── users.ts
│           ├── generation_jobs.ts
│           ├── feedback.ts
│           ├── webhook_logs.ts
│           └── admin_settings.ts
```

## Webhook Endpoint

Paddle webhooks → `POST /api/webhooks/paddle`

Supported events:
- `subscription_created` → Activate plan + assign credits
- `subscription_payment_succeeded` → Reset monthly credits
- `subscription_cancelled` → Update subscription status
- `subscription_payment_failed` → Update payment status
