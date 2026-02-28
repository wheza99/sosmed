import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List posts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    if (!orgId) return NextResponse.json({ status: "failed", message: "Organization ID required" }, { status: 400 });

    const { data: membership } = await supabase.from("members").select("org_id").eq("user_id", authUser.id).eq("org_id", orgId).single();
    if (!membership) return NextResponse.json({ status: "failed", message: "Access denied" }, { status: 403 });

    let query = supabase.from("posts").select("*, account:social_accounts(id, platform, username, display_name, avatar_url)").eq("org_id", orgId);
    if (accountId) query = query.eq("account_id", accountId);
    if (status) query = query.eq("status", status);

    const { data: posts, error } = await query.order("created_at", { ascending: false });
    if (error) return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });

    return NextResponse.json({ status: "success", data: posts });
  } catch (err) {
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// POST - Create and publish post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, org_id, content } = body;

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    if (!account_id || !org_id || !content) return NextResponse.json({ status: "failed", message: "account_id, org_id, and content required" }, { status: 400 });

    const { data: membership } = await supabase.from("members").select("org_id").eq("user_id", authUser.id).eq("org_id", org_id).single();
    if (!membership) return NextResponse.json({ status: "failed", message: "Access denied" }, { status: 403 });

    const { data: account, error: accountError } = await supabase.from("social_accounts").select("id, platform, username, access_token, token_expires_at").eq("id", account_id).single();
    if (accountError || !account) return NextResponse.json({ status: "failed", message: "Account not found" }, { status: 404 });

    if (!account.access_token) return NextResponse.json({ status: "failed", message: "Account not connected", needsReconnect: true }, { status: 400 });
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) return NextResponse.json({ status: "failed", message: "Token expired", needsReconnect: true }, { status: 400 });

    let status = 'draft';
    let platformPostId = null;
    let errorMessage = null;
    let postedAt = null;

    if (account.platform === 'x') {
      if (content.length > 280) return NextResponse.json({ status: "failed", message: "Content exceeds 280 chars for X" }, { status: 400 });

      try {
        const response = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content }),
        });
        const data = await response.json();

        if (!response.ok) {
          status = 'failed';
          errorMessage = JSON.stringify(data.errors || data);
        } else {
          status = 'posted';
          platformPostId = data.data?.id || null;
          postedAt = new Date().toISOString();
        }
      } catch (err) {
        status = 'failed';
        errorMessage = String(err);
      }
    } else {
      return NextResponse.json({ status: "failed", message: `Platform '${account.platform}' not supported` }, { status: 400 });
    }

    const { data: post, error } = await supabase.from("posts").insert({
      account_id, org_id, user_id: authUser.id, content, status, platform_post_id: platformPostId, error_message: errorMessage, posted_at: postedAt,
    }).select().single();

    if (error) return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });

    return NextResponse.json({ status: "success", data: post, posted: status === 'posted' });
  } catch (err) {
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}
