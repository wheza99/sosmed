import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { name } = await request.json();

  // Get current user (validasi auth)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { status: "failed", message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create organization using admin client (bypass RLS)
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert([
      {
        name,
        slug,
        created_by: authUser.id,
      },
    ])
    .select()
    .single();

  if (orgError) {
    return NextResponse.json(
      { status: "failed", message: orgError.message },
      { status: 400 }
    );
  }

  // Add user as owner using admin client (bypass RLS)
  const { error: memberError } = await adminClient.from("members").insert([
    {
      user_id: authUser.id,
      org_id: org.id,
      role: "owner",
    },
  ]);

  if (memberError) {
    return NextResponse.json(
      { status: "failed", message: memberError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: "success",
    organization: { ...org, role: "owner" },
  });
}
