export interface ApiKey {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  key_suffix: string;
  is_active: boolean | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  
  // Relation (optional, populated on fetch)
  organizations?: {
    name: string;
  };
}

// For creating a new API key
export interface CreateApiKeyInput {
  name: string;
  expiresIn?: '7d' | '90d' | '1y' | 'never';
  customDate?: string;
  orgId: string;
}

// API key response (includes the full key only once on creation)
export interface ApiKeyResponse extends ApiKey {
  key?: string; // Only present on creation
}
