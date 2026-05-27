# Backend Deployment Guide

This guide outlines the steps required to deploy the Enterprise POS Backend to Cloudflare Workers, including provisioning all necessary infrastructure (D1, KV, R2, Queues, Analytics, and Durable Objects).

## Prerequisites
- Node.js (v22+)
- Cloudflare Account
- `wrangler` CLI installed (`npm install -g wrangler`)
- Logged into Cloudflare (`wrangler login`)

---

## 1. Provision Infrastructure

Run the following commands in the terminal and update your `wrangler.jsonc` file with the generated IDs.

### Database (D1)
Create the primary relational database for the POS system.
```bash
wrangler d1 create mmnext-enterprise-pos-db
```
*Update the `database_id` in `wrangler.jsonc` under `d1_databases`.*

### Cache (KV)
Create the KV namespace used for rate limiting and fast lookups.
```bash
wrangler kv:namespace create CACHE
```
*Update the `id` in `wrangler.jsonc` under `kv_namespaces`.*

### File Storage (R2)
Create the bucket for storing product images and receipts.
```bash
wrangler r2 bucket create mmnext-enterprise-pos-storage
```

### Background Processing (Queues)
Create the queue for asynchronous tasks like sending emails and low stock alerts.
```bash
wrangler queues create mmnext-enterprise-pos-email-queue
```

---

## 2. Apply Database Migrations
Before deploying the code, you must create the tables in your D1 database.

**Local Testing:**
```bash
wrangler d1 execute mmnext-enterprise-pos-db --local --file=database/schema.sql
```

**Production:**
```bash
wrangler d1 execute mmnext-enterprise-pos-db --remote --file=database/schema.sql
```

*(Note: We recommend using Wrangler Migrations (`wrangler d1 migrations apply`) for future schema updates instead of raw execution).*

---

## 3. Set Up Secrets
Never hardcode API keys. Use Wrangler to securely inject them into the production environment.

**Google Gemini API Key (For Smart Search):**
```bash
wrangler secret put GEMINI_API_KEY
```
*(Paste your key when prompted)*

**JWT Secret (For Authentication):**
```bash
wrangler secret put JWT_SECRET
```
*(Paste a strong, random string)*

---

## 4. Local Development

To run the full stack locally (including simulated D1, KV, Queues, and Durable Objects):
```bash
npm install
npm run dev
```

To manually trigger Scheduled Tasks (Crons) locally for testing:
```bash
curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"
```

---

## 5. Deploy to Production

Once everything is configured and tested locally, compile TypeScript and deploy the Worker to Cloudflare's global edge network.

```bash
npm run build
npm run deploy
```

Upon successful deployment, Wrangler will provide you with the live `.workers.dev` URL for your POS backend.