import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest } from "next/server";
import crypto from "crypto";

export interface AuthUser {
  id: string; // UUID from auth.users
  email: string;
  authType: 'session' | 'api_key';
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const supabase = await createClient();

  // 1. Try Session Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (user && user.email) {
    return { id: user.id, email: user.email, authType: 'session' };
  }

  // 2. Try API Key Authentication
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    // Hash the incoming key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Use Admin Client to bypass RLS for API Key validation
    const adminClient = createAdminClient();

    const { data: keyData } = await adminClient
      .from("api_keys")
      .select("user_id, is_active, expires_at")
      .eq("key_hash", keyHash)
      .single();

    if (keyData && keyData.is_active) {
      // Check expiration
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return null; // Key expired
      }

      // Get user email
      const { data: userData } = await adminClient
        .from("users")
        .select("email")
        .eq("id", keyData.user_id)
        .single();

      // Update last_used_at asynchronously
      adminClient
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", keyHash)
        .then();

      return {
        id: keyData.user_id,
        email: userData?.email || '',
        authType: 'api_key'
      };
    }
  }

  return null;
}
