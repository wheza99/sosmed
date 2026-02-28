import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get a single social account by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    // Fetch the account
    const { data: account, error } = await supabase
      .from("social_accounts")
      .select("id, org_id, platform, username, display_name, platform_user_id, avatar_url, follower_count, brand_name, tone, writing_style, language, target_audience, brand_guidelines, do_not_post, is_active, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !account) {
      return NextResponse.json({ status: "failed", message: "Account not found" }, { status: 404 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", account.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this account" }, { status: 403 });
    }

    return NextResponse.json({ status: "success", data: account });
  } catch (err) {
    console.error("Unexpected error in GET /api/accounts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH - Update a social account (mainly for brand info)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    // First, verify access
    const { data: account } = await supabase
      .from("social_accounts")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!account) {
      return NextResponse.json({ status: "failed", message: "Account not found" }, { status: 404 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", account.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this account" }, { status: 403 });
    }

    // Update the account
    const { data: updated, error } = await supabase
      .from("social_accounts")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating social account:", error);
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/accounts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Delete a social account
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    // First, verify access
    const { data: account } = await supabase
      .from("social_accounts")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!account) {
      return NextResponse.json({ status: "failed", message: "Account not found" }, { status: 404 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", account.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this account" }, { status: 403 });
    }

    // Delete the account
    const { error } = await supabase
      .from("social_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting social account:", error);
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", message: "Account deleted successfully" });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/accounts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}
