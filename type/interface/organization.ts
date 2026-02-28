export interface Organization {
  id: string; // UUID
  name: string;
  slug: string | null;
  image_url: string | null;
  created_by: string | null; // UUID referencing users.id
  created_at: string; // ISO timestamp
}
