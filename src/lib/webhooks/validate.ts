export interface WebhookLeadPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ValidationResult {
  success: true;
  data: WebhookLeadPayload;
}

export interface ValidationError {
  success: false;
  errors: string[];
}

const STRING_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "streetAddress",
  "city",
  "state",
  "zip",
] as const;

const ALLOWED_KEYS = new Set(STRING_FIELDS);

function trimOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function validateWebhookPayload(
  body: unknown
): ValidationResult | ValidationError {
  if (body === null || typeof body !== "object") {
    return { success: false, errors: ["Request body must be a JSON object."] };
  }

  const record = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof record.name !== "string" || !record.name.trim()) {
    errors.push('"name" is required and must be a non-empty string.');
  }

  for (const field of STRING_FIELDS) {
    if (field === "name") continue;
    const value = record[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      errors.push(`"${field}" must be a string when provided.`);
    }
  }

  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key as (typeof STRING_FIELDS)[number])) {
      errors.push(
        `Unknown field "${key}" — allowed fields: ${Array.from(ALLOWED_KEYS).join(", ")}.`
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: (record.name as string).trim(),
      phone: trimOptionalString(record.phone),
      email: trimOptionalString(record.email),
      address: trimOptionalString(record.address),
      streetAddress: trimOptionalString(record.streetAddress),
      city: trimOptionalString(record.city),
      state: trimOptionalString(record.state),
      zip: trimOptionalString(record.zip),
    },
  };
}

export function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-webhook-secret");
  if (headerSecret === secret) return true;

  return false;
}