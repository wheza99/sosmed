import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List all social accounts for an organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json({ status: "failed", message: "Organization ID is required" }, { status: 400 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", orgId)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this organization" }, { status: 403 });
    }

    // Fetch social accounts (exclude sensitive tokens)
    const { data: accounts, error } = await supabase
      .from("social_accounts")
      .select("id, org_id, platform, username, display_name, platform_user_id, avatar_url, follower_count, brand_name, tone, writing_style, language, target_audience, brand_guidelines, do_not_post, is_active, created_at, updated_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error fetching accounts:", error);
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data: accounts });
  } catch (err) {
    console.error("Unexpected error in GET /api/accounts:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// POST - Create a new social account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { org_id, platform, username, display_name, platform_user_id, avatar_url, follower_count, brand_name, tone, writing_style, language, target_audience, brand_guidelines, do_not_post } = body;

    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    if (!org_id || !platform || !username) {
      return NextResponse.json({ status: "failed", message: "Organization ID, platform, and username are required" }, { status: 400 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this organization" }, { status: 403 });
    }

    // Create the social account
    const { data: account, error } = await supabase
      .from("social_accounts")
      .insert({
        org_id,
        user_id: authUser.id,
        platform,
        username,
        display_name: display_name || null,
        platform_user_id: platform_user_id || null,
        avatar_url: avatar_url || null,
        follower_count: follower_count || 0,
        brand_name: brand_name || null,
        tone: tone || 'professional',
        writing_style: writing_style || null,
        language: language || 'en',
        target_audience: target_audience || null,
        brand_guidelines: brand_guidelines || null,
        do_not_post: do_not_post || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating social account:", error);
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data: account });
  } catch (err) {
    console.error("Unexpected error in POST /api/accounts:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}
