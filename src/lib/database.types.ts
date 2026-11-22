export type CmsContentType = "article" | "project" | "research" | "experiment" | "now";
export type CmsContentStatus = "draft" | "published" | "archived";

export interface ContentEntryRow {
  [key: string]: unknown;
  id: string;
  content_type: CmsContentType;
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  category: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  status: CmsContentStatus;
  featured: boolean;
  published_at: string | null;
  position: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentEntryInsert {
  [key: string]: unknown;
  content_type: CmsContentType;
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  category?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  featured?: boolean;
  position?: number;
  metadata?: Record<string, unknown>;
}

export type ContentEntryUpdate = Partial<ContentEntryInsert>;

export interface MediaAssetRow {
  [key: string]: unknown;
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  width: number | null;
  height: number | null;
  alt_text: string;
  created_by: string;
  created_at: string;
}

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  __InternalSupabase: { PostgrestVersion: "14.1" };
  public: {
    Tables: {
      admin_users: Table<{ user_id: string; added_at: string }, { user_id: string }, never>;
      content_entries: Table<ContentEntryRow, ContentEntryInsert, ContentEntryUpdate>;
      media_assets: Table<MediaAssetRow, {
        storage_path: string;
        file_name: string;
        mime_type: MediaAssetRow["mime_type"];
        byte_size: number;
        width?: number | null;
        height?: number | null;
        alt_text: string;
      }, Partial<Pick<MediaAssetRow, "alt_text" | "width" | "height">>>;
      content_media: Table<{ content_id: string; media_id: string; created_at: string }, {
        content_id: string;
        media_id: string;
      }, never>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      content_status: CmsContentStatus;
      content_type: CmsContentType;
    };
    CompositeTypes: Record<string, never>;
  };
}
