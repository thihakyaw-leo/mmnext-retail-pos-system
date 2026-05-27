# Enterprise POS API Endpoints

This document outlines the core API endpoints available in the Cloudflare Workers POS Backend. All endpoints (except `/api/auth/*` and `/ws`) require a valid JWT Bearer token.

## Global Rate Limits
- **Auth Routes (`/api/auth/*`)**: 5 requests per minute per IP.
- **Standard Routes (`/api/*`)**: 100 requests per minute per IP.

---

## 1. Authentication (`/api/auth`)
Public routes.

| Method | Endpoint | Description | Payload (JSON) |
|--------|----------|-------------|----------------|
| `POST` | `/api/auth/login` | Authenticate user and receive JWT | `{ "email": "...", "password": "..." }` |
| `POST` | `/api/auth/register` | Register a new user | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/auth/forgot-password` | Request password reset email (Queue) | `{ "email": "..." }` |
| `POST` | `/api/auth/reset-password` | Reset password using token | `{ "token": "...", "newPassword": "..." }` |

---

## 2. Inventory (`/api/inventory`)
Requires Authentication.

| Method | Endpoint | RBAC | Description | Payload (JSON) |
|--------|----------|------|-------------|----------------|
| `POST` | `/api/inventory/bulk-update`| `admin`, `manager` | Update multiple stock levels at once using D1 Batching. | `{ "adjustments": [{ "product_id": 1, "store_id": 1, "quantity": 50 }] }` |

*(Note: Other CRUD operations for inventory are implemented in their respective controllers).*

---

## 3. Artificial Intelligence (`/api/ai`)
Requires Authentication. Powered by Google Gemini API.

| Method | Endpoint | Description | Payload (JSON) |
|--------|----------|-------------|----------------|
| `POST` | `/api/ai/smart-search` | Converts natural language to structured JSON for intelligent database querying. | `{ "query": "Red summer shirt under $20" }` |

---

## 4. WebSockets (`/ws`)
Public (Token verification happens post-connection if necessary).

| Method | Endpoint | Description | 
|--------|----------|-------------|
| `GET` | `/ws` | Connects to the Durable Object (e.g. `main-store`) for real-time sales and inventory updates via Hibernatable WebSockets. Must pass `Upgrade: websocket` header. |

---

## 5. System & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api` | Returns API version, documentation links, and limits. |
| `GET` | `/health` | Returns `{"status": "healthy"}` and timestamp. |

*(Note: All API requests are automatically tracked by the Global Analytics Middleware and sent to Cloudflare Workers Analytics Engine `POS_EVENTS`).*