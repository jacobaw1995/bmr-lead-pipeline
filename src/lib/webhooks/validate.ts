export interface WebhookLeadPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ValidationResult {
  success: true;
  data: WebhookLeadPayload;
}

export interface ValidationError {
  success: false;
  errors: string[];
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

  if (
    record.phone !== undefined &&
    record.phone !== null &&
    typeof record.phone !== "string"
  ) {
    errors.push('"phone" must be a string when provided.');
  }

  if (
    record.email !== undefined &&
    record.email !== null &&
    typeof record.email !== "string"
  ) {
    errors.push('"email" must be a string when provided.');
  }

  if (
    record.address !== undefined &&
    record.address !== null &&
    typeof record.address !== "string"
  ) {
    errors.push('"address" must be a string when provided.');
  }

  const allowedKeys = new Set(["name", "phone", "email", "address"]);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field "${key}" — allowed fields: name, phone, email, address.`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: (record.name as string).trim(),
      phone:
        typeof record.phone === "string" && record.phone.trim()
          ? record.phone.trim()
          : undefined,
      email:
        typeof record.email === "string" && record.email.trim()
          ? record.email.trim()
          : undefined,
      address:
        typeof record.address === "string" && record.address.trim()
          ? record.address.trim()
          : undefined,
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