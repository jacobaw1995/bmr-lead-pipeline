# Webhook Lead Intake

The Field accepts incoming leads from the Brothers Metal Roofing website (or any external form) via a **Next.js API route** on Vercel.

> **Why a Next.js route instead of a Supabase Edge Function?**  
> The app already deploys to Vercel with Supabase as the database. A single API route keeps webhook logic in the same codebase, uses the existing service-role key, and revalidates the field UI after each insert — no separate edge deploy to manage.

---

## Endpoint

```
POST https://<your-vercel-domain>/api/webhooks/leads
```

Local development:

```
POST http://localhost:3000/api/webhooks/leads
```

---

## Authentication

Every request must include your webhook secret using **one** of these methods:

**Option A — Authorization header (recommended)**

```
Authorization: Bearer <WEBHOOK_SECRET>
```

**Option B — Custom header**

```
X-Webhook-Secret: <WEBHOOK_SECRET>
```

Generate a strong secret (e.g. `openssl rand -hex 32`) and set it in:

- `.env.local` for local dev
- Vercel → Project → Settings → Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WEBHOOK_SECRET` | Yes | Shared secret — reject requests without a valid match |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for inserting leads (bypasses RLS) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Already required by the app |

---

## Request body

`Content-Type: application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Contact name |
| `phone` | string | No | Phone number |
| `email` | string | No | Email address |
| `address` | string | No | Property / mailing address |

Extra fields are rejected with a `400` response.

### Example payload

```json
{
  "name": "Jane Doe",
  "phone": "(555) 987-6543",
  "email": "jane@example.com",
  "address": "456 Oak Ave, Springfield, IL"
}
```

---

## Responses

### `201 Created` — success

```json
{
  "success": true,
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

The lead appears in the **Lead Box** on The Field with:
- `source`: `webhook`
- `stage`: `lead_captured`
- `status`: `active`
- `owner_id`: `null` (shows as **Unclaimed** until a salesman takes it)

### `400 Bad Request` — validation error

```json
{
  "error": "Validation failed.",
  "details": ["\"name\" is required and must be a non-empty string."]
}
```

### `401 Unauthorized` — missing or wrong secret

### `503 Service Unavailable` — `WEBHOOK_SECRET` not configured on server

---

## Test with curl

Replace the URL and secret with your values:

```bash
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -d '{
    "name": "Test Webhook Lead",
    "phone": "555-000-1234",
    "email": "test@example.com",
    "address": "123 Test St"
  }'
```

Expected: `{"success":true,"id":"..."}` and the lead visible in the Lead Box after refreshing `/field`.

---

## Wiring up the website form

Point your website form handler (or form service like Formspree, Netlify Forms, or a custom serverless function) to POST the same JSON shape to this URL with the `Authorization` header.

Minimum viable payload from a simple contact form:

```json
{ "name": "John Smith", "email": "john@example.com", "phone": "555-123-4567" }
```

---

## Claiming unclaimed webhook leads

Webhook leads have no owner until claimed. In the app they display with an **Unclaimed** badge. A manager can drag them through the pipeline; claiming workflow for salesmen can be added in a future phase.