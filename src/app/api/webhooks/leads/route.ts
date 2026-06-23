import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateWebhookPayload,
  verifyWebhookSecret,
} from "@/lib/webhooks/validate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook is not configured on the server." },
      { status: 503 }
    );
  }

  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validation = validateWebhookPayload(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: validation.errors },
      { status: 400 }
    );
  }

  const { name, phone, email, address } = validation.data;

  try {
    const supabase = createAdminClient();

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        source: "webhook",
        stage: "lead_captured",
        status: "active",
        owner_id: null,
      })
      .select("id")
      .single();

    if (insertError || !lead) {
      console.error("Webhook lead insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to create lead." },
        { status: 500 }
      );
    }

    revalidatePath("/", "layout");

    return NextResponse.json(
      { success: true, id: lead.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}