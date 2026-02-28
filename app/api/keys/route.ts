import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { getUserFromRequest } from "@/lib/keys/auth-helper";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { name, expiresIn, customDate, orgId } = await req.json();
    const supabase = await createClient();
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ status: "failed", message: "Organization ID is required" }, { status: 400 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this organization" }, { status: 403 });
    }

    // Determine expiration
    let expiresAt: Date | null = null;
    const now = new Date();

    if (expiresIn === '7d') expiresAt = addDays(now, 7);
    else if (expiresIn === '90d') expiresAt = addDays(now, 90);
    else if (expiresIn === '1y') expiresAt = addDays(now, 365);
    else if (expiresIn === 'custom' && customDate) expiresAt = new Date(customDate);
    // if 'never' or undefined, expiresAt remains null

    // Generate a secure API key with prefix
    const randomPart = randomBytes(24).toString('hex');
    const apiKey = `sosmed_${randomPart}`;

    // Hash the key for storage
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Get prefix for display (first 7 chars)
    const keyPrefix = apiKey.substring(0, 7);
    // Get suffix for display (last 4 chars)
    const keySuffix = apiKey.substring(apiKey.length - 4);

    const { data: result, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        org_id: orgId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    // Return the RAW api key only once here.
    return NextResponse.json({
      status: "success",
      data: {
        ...result,
        key: apiKey // This is the ONLY time the full key is returned
      }
    });
  } catch {
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    const supabase = await createClient();
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("api_keys")
      .select("id, name, key_prefix, key_suffix, created_at, last_used_at, is_active, expires_at, org_id, organizations(name)")
      .eq("user_id", user.id);

    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data: apiKeys, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Database error fetching API keys:", error);
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data: apiKeys });
  } catch (err) {
    console.error("Unexpected error in GET /api/keys:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const supabase = await createClient();
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", message: "API Key deleted successfully" });
  } catch {
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}
