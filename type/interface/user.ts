import { Organization } from "./organization";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image_url?: string | null;
  created_at: string;
  organizations?: Organization[];
}
