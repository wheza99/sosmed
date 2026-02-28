import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // 1. Get current authenticated user from Supabase Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    // If no user is logged in, return null
    return NextResponse.json(null);
  }

  // 2. Check if user exists in public.users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", authUser.email)
    .single();

  let finalUser = existingUser;

  if (!existingUser) {
    // 3. If user doesn't exist in public.users, create a new record
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          id: authUser.id,
          email: authUser.email,
          name:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            authUser.email?.split("@")[0],
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating user in public table:", insertError);
      return NextResponse.json(
        { error: "Failed to create user record", details: insertError },
        { status: 500 },
      );
    }
    finalUser = newUser;
  }

  // 4. Fetch organizations
  const { data: memberData } = await supabase
    .from("members")
    .select(`
      role,
      organizations (*)
    `)
    .eq("user_id", finalUser.id);

  const organizations = memberData?.map((m) => ({
    ...(Array.isArray(m.organizations) ? m.organizations[0] : m.organizations),
    role: m.role,
  })) || [];

  return NextResponse.json({ ...finalUser, organizations });
}
