import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch post info from X API by platform_post_id
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

    // Get the post from database to find account and platform_post_id
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select(`
        id,
        platform_post_id,
        account_id,
        org_id,
        status,
        account:social_accounts(id, platform, access_token)
      `)
      .eq("id", id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ status: "failed", message: "Post not found" }, { status: 404 });
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", post.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this post" }, { status: 403 });
    }

    // If not posted yet, return DB data only
    if (!post.platform_post_id) {
      return NextResponse.json({ 
        status: "success", 
        data: post,
        platformData: null,
        message: "Post not yet published to platform"
      });
    }

    // Get access token from account
    const account = Array.isArray(post.account) ? post.account[0] : post.account;
    
    if (!account?.access_token) {
      return NextResponse.json({ 
        status: "failed", 
        message: "Account token not available" 
      }, { status: 400 });
    }

    // Fetch from X API
    if (account.platform === 'x') {
      const tweetFields = 'created_at,public_metrics,author_id,text,edit_controls';
      
      const response = await fetch(
        `https://api.x.com/2/tweets?ids=${post.platform_post_id}&tweet.fields=${tweetFields}`,
        {
          headers: {
            'Authorization': `Bearer ${account.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("X API error:", data);
        return NextResponse.json({ 
          status: "failed", 
          message: "Failed to fetch from X API",
          error: data.errors || data
        }, { status: response.status });
      }

      // Update post_insights in DB
      if (data.data && data.data[0]) {
        const tweet = data.data[0];
        const metrics = tweet.public_metrics;

        // Insert or update insights
        await supabase
          .from("post_insights")
          .upsert({
            post_id: post.id,
            likes: metrics.like_count || 0,
            comments: metrics.reply_count || 0,
            shares: metrics.retweet_count || 0,
            views: metrics.impression_count || 0,
            engagement_rate: calculateEngagementRate(metrics),
          }, {
            onConflict: 'post_id, collected_at'
          });
      }

      return NextResponse.json({ 
        status: "success", 
        data: post,
        platformData: data.data?.[0] || null,
        includes: data.includes || null
      });
    }

    return NextResponse.json({ 
      status: "failed", 
      message: `Platform '${account.platform}' not supported` 
    }, { status: 400 });

  } catch (err) {
    console.error("Unexpected error in GET /api/posts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// Helper function to calculate engagement rate
function calculateEngagementRate(metrics: {
  like_count?: number;
  reply_count?: number;
  retweet_count?: number;
  impression_count?: number;
}): number {
  const totalEngagements = (metrics.like_count || 0) + 
                           (metrics.reply_count || 0) + 
                           (metrics.retweet_count || 0);
  const impressions = metrics.impression_count || 1;
  
  return Number((totalEngagements / impressions).toFixed(4));
}

// PATCH - Update a post
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    // Verify access
    const { data: post } = await supabase
      .from("posts")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!post) {
      return NextResponse.json({ status: "failed", message: "Post not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", post.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this post" }, { status: 403 });
    }

    // Update post
    const { data: updated, error } = await supabase
      .from("posts")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (err) {
    console.error("Unexpected error in PATCH /api/posts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE - Delete a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ status: "failed", message: "Unauthorized" }, { status: 401 });
    }

    // Verify access
    const { data: post } = await supabase
      .from("posts")
      .select("org_id")
      .eq("id", id)
      .single();

    if (!post) {
      return NextResponse.json({ status: "failed", message: "Post not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("members")
      .select("org_id")
      .eq("user_id", authUser.id)
      .eq("org_id", post.org_id)
      .single();

    if (!membership) {
      return NextResponse.json({ status: "failed", message: "You don't have access to this post" }, { status: 403 });
    }

    // Delete post
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ status: "failed", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", message: "Post deleted" });
  } catch (err) {
    console.error("Unexpected error in DELETE /api/posts/[id]:", err);
    return NextResponse.json({ status: "failed", message: "Internal Server Error" }, { status: 500 });
  }
}
