/**
 * MediaOS database types aligned with supabase/migrations.
 * Regenerate from Supabase CLI when the schema evolves:
 *   npx supabase gen types typescript --local > src/shared/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MembershipStatus = "active" | "invited" | "suspended";

export type StoryStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "review"
  | "approved"
  | "published"
  | "archived";

export type StoryVoiceStatus =
  | "none"
  | "pending"
  | "generating"
  | "ready"
  | "failed"
  | "stale";

export type StoryPackageStatus =
  | "draft"
  | "building"
  | "ready"
  | "failed"
  | "archived";

export type StorySceneInstanceStatus =
  | "draft"
  | "ready"
  | "editing"
  | "archived";

export type AssetDiscoveryRunStatus =
  | "draft"
  | "running"
  | "ready"
  | "failed"
  | "archived";

export type AssetDiscoveryProvider =
  | "local_media_library"
  | "supabase_storage"
  | "organization_library"
  | "free_image"
  | "free_video"
  | "licensed_stock"
  | "news_agency"
  | "custom_search"
  | "previously_used";

export type AssetDiscoveryKind =
  | "video"
  | "image"
  | "illustration"
  | "map"
  | "icon"
  | "logo"
  | "chart"
  | "infographic"
  | "document"
  | "pdf"
  | "screenshot"
  | "other";

export type AssetDiscoveryDecision =
  | "pending"
  | "accepted"
  | "rejected"
  | "replaced";

export type StoryPriority = "low" | "normal" | "high" | "urgent";

export type MediaFileType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "text"
  | "other";

export type MediaStorageScope =
  | "organizations"
  | "stories"
  | "shared"
  | "templates"
  | "branding"
  | "temporary";

export type ContentObjectType =
  | "script"
  | "article"
  | "video_package"
  | "graphic"
  | "voiceover"
  | "timeline"
  | "clip"
  | "package"
  | "other";

export type ContentObjectStatus =
  | "draft"
  | "in_progress"
  | "ready"
  | "published"
  | "archived"
  | "failed";

export type OutputPlatform =
  | "youtube"
  | "facebook"
  | "instagram"
  | "website"
  | "telegram"
  | "broadcast"
  | "shorts"
  | "reels";

export type OutputPackageStatus = "draft" | "ready" | "published" | "failed";

export type AiJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type RenderJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PublishJobStatus =
  | "queued"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type IntakeExtractionStatus =
  | "pending"
  | "validating"
  | "extracting"
  | "metadata_ready"
  | "story_created"
  | "failed"
  | "cancelled";

export type IntakeSourceCategory =
  | "manual"
  | "url"
  | "feed"
  | "document"
  | "media"
  | "social";

export type AiWorkflowStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type AiWorkflowTaskType =
  | "research"
  | "headline_suggestion"
  | "summary"
  | "script_generation"
  | "translation"
  | "voice_over"
  | "timeline_draft"
  | "thumbnail_suggestion"
  | "poster_suggestion"
  | "seo_metadata"
  | "social_media_package";

export type AiWorkflowTaskStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export type AiProductionStage =
  | "research"
  | "editorial"
  | "script"
  | "translation"
  | "voice"
  | "timeline"
  | "graphics"
  | "publishing";

export type AiMessageRole = "user" | "assistant" | "system";

export type AiWorkspaceActionType =
  | "research"
  | "generate_script"
  | "translate"
  | "generate_voice"
  | "create_timeline"
  | "create_thumbnail"
  | "create_poster"
  | "seo"
  | "social_package"
  | "fact_check"
  | "chat";

export type AiWorkspaceOutputStatus =
  | "generating"
  | "waiting_for_approval"
  | "approved"
  | "rejected"
  | "cancelled";

export type CreativeProjectStatus = "draft" | "active" | "archived";

export type CreativeTrackKind = "video" | "audio" | "graphics" | "subtitle";

export type CreativeClipKind =
  | "image"
  | "video"
  | "audio"
  | "graphic"
  | "subtitle"
  | "marker";

export type CreativePlaceholderKind =
  | "headline"
  | "anchor"
  | "image"
  | "video"
  | "voice"
  | "music"
  | "logo"
  | "ticker"
  | "outro";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          module: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          module: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          module?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role_id: string;
          default_workspace_id: string | null;
          status: MembershipStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role_id: string;
          default_workspace_id?: string | null;
          status?: MembershipStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role_id?: string;
          default_workspace_id?: string | null;
          status?: MembershipStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_default_workspace_id_fkey";
            columns: ["default_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          subtitle: string | null;
          slug: string;
          summary: string | null;
          status: StoryStatus;
          priority: StoryPriority;
          category: string | null;
          language: string;
          reporter_id: string | null;
          editor_id: string | null;
          created_by: string;
          updated_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          approved_script: string | null;
          approved_by: string | null;
          approved_at: string | null;
          voice_status: StoryVoiceStatus;
          voice_url: string | null;
          voice_duration_ms: number | null;
          voice_name: string | null;
          voice_language: string | null;
          voice_speaking_rate: number | null;
          voice_pitch: number | null;
          voice_volume_gain_db: number | null;
          voice_generated_at: string | null;
          voice_error: string | null;
          voice_storage_path: string | null;
          sub_headline_media: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          subtitle?: string | null;
          slug: string;
          summary?: string | null;
          status?: StoryStatus;
          priority?: StoryPriority;
          category?: string | null;
          language?: string;
          reporter_id?: string | null;
          editor_id?: string | null;
          created_by: string;
          updated_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          approved_script?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          voice_status?: StoryVoiceStatus;
          voice_url?: string | null;
          voice_duration_ms?: number | null;
          voice_name?: string | null;
          voice_language?: string | null;
          voice_speaking_rate?: number | null;
          voice_pitch?: number | null;
          voice_volume_gain_db?: number | null;
          voice_generated_at?: string | null;
          voice_error?: string | null;
          voice_storage_path?: string | null;
          sub_headline_media?: Json;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          subtitle?: string | null;
          slug?: string;
          summary?: string | null;
          status?: StoryStatus;
          priority?: StoryPriority;
          category?: string | null;
          language?: string;
          reporter_id?: string | null;
          editor_id?: string | null;
          created_by?: string;
          updated_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          approved_script?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          voice_status?: StoryVoiceStatus;
          voice_url?: string | null;
          voice_duration_ms?: number | null;
          voice_name?: string | null;
          voice_language?: string | null;
          voice_speaking_rate?: number | null;
          voice_pitch?: number | null;
          voice_volume_gain_db?: number | null;
          voice_generated_at?: string | null;
          voice_error?: string | null;
          voice_storage_path?: string | null;
          sub_headline_media?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "stories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_editor_id_fkey";
            columns: ["editor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_folders: {
        Row: {
          id: string;
          organization_id: string;
          parent_id: string | null;
          name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_id?: string | null;
          name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          parent_id?: string | null;
          name?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_folders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          id: string;
          organization_id: string;
          folder_id: string | null;
          name: string;
          original_filename: string;
          storage_bucket: MediaStorageScope;
          storage_path: string;
          file_type: MediaFileType;
          mime_type: string;
          file_size: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          checksum: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          folder_id?: string | null;
          name: string;
          original_filename: string;
          storage_bucket?: MediaStorageScope;
          storage_path: string;
          file_type?: MediaFileType;
          mime_type: string;
          file_size: number;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          checksum?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          folder_id?: string | null;
          name?: string;
          original_filename?: string;
          storage_bucket?: MediaStorageScope;
          storage_path?: string;
          file_type?: MediaFileType;
          mime_type?: string;
          file_size?: number;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          checksum?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_tags: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_tags_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      media_asset_tags: {
        Row: {
          media_asset_id: string;
          media_tag_id: string;
          created_at: string;
        };
        Insert: {
          media_asset_id: string;
          media_tag_id: string;
          created_at?: string;
        };
        Update: {
          media_asset_id?: string;
          media_tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_tags_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_asset_tags_media_tag_id_fkey";
            columns: ["media_tag_id"];
            isOneToOne: false;
            referencedRelation: "media_tags";
            referencedColumns: ["id"];
          },
        ];
      };
      story_media: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          media_asset_id: string;
          sort_order: number;
          label: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          media_asset_id: string;
          sort_order?: number;
          label?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          media_asset_id?: string;
          sort_order?: number;
          label?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "story_media_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_media_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      story_scripts: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          content_html: string;
          content_plain: string;
          word_count: number;
          character_count: number;
          version: number;
          is_current: boolean;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          content_html?: string;
          content_plain?: string;
          word_count?: number;
          character_count?: number;
          version?: number;
          is_current?: boolean;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          content_html?: string;
          content_plain?: string;
          word_count?: number;
          character_count?: number;
          version?: number;
          is_current?: boolean;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "story_scripts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_scripts_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      content_objects: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          type: ContentObjectType;
          title: string;
          status: ContentObjectStatus;
          language: string;
          metadata: Json;
          version: number;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          type?: ContentObjectType;
          title: string;
          status?: ContentObjectStatus;
          language?: string;
          metadata?: Json;
          version?: number;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          type?: ContentObjectType;
          title?: string;
          status?: ContentObjectStatus;
          language?: string;
          metadata?: Json;
          version?: number;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "content_objects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "content_objects_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      output_packages: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          content_object_id: string;
          platform: OutputPlatform;
          status: OutputPackageStatus;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          content_object_id: string;
          platform: OutputPlatform;
          status?: OutputPackageStatus;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          content_object_id?: string;
          platform?: OutputPlatform;
          status?: OutputPackageStatus;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "output_packages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "output_packages_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "output_packages_content_object_id_fkey";
            columns: ["content_object_id"];
            isOneToOne: false;
            referencedRelation: "content_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_jobs: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string | null;
          content_object_id: string | null;
          provider: string;
          model: string | null;
          job_type: string;
          status: AiJobStatus;
          request: Json;
          response: Json | null;
          tokens_used: number | null;
          cost: number | null;
          processing_time_ms: number | null;
          error: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id?: string | null;
          content_object_id?: string | null;
          provider: string;
          model?: string | null;
          job_type: string;
          status?: AiJobStatus;
          request?: Json;
          response?: Json | null;
          tokens_used?: number | null;
          cost?: number | null;
          processing_time_ms?: number | null;
          error?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string | null;
          content_object_id?: string | null;
          provider?: string;
          model?: string | null;
          job_type?: string;
          status?: AiJobStatus;
          request?: Json;
          response?: Json | null;
          tokens_used?: number | null;
          cost?: number | null;
          processing_time_ms?: number | null;
          error?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_jobs_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_jobs_content_object_id_fkey";
            columns: ["content_object_id"];
            isOneToOne: false;
            referencedRelation: "content_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      render_jobs: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          content_object_id: string | null;
          renderer: string;
          status: RenderJobStatus;
          progress: number;
          output_path: string | null;
          started_at: string | null;
          finished_at: string | null;
          error: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          content_object_id?: string | null;
          renderer: string;
          status?: RenderJobStatus;
          progress?: number;
          output_path?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          error?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          content_object_id?: string | null;
          renderer?: string;
          status?: RenderJobStatus;
          progress?: number;
          output_path?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          error?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "render_jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "render_jobs_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "render_jobs_content_object_id_fkey";
            columns: ["content_object_id"];
            isOneToOne: false;
            referencedRelation: "content_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      publish_jobs: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          output_package_id: string;
          destination: OutputPlatform;
          status: PublishJobStatus;
          scheduled_at: string | null;
          published_at: string | null;
          response: Json | null;
          error: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          output_package_id: string;
          destination: OutputPlatform;
          status?: PublishJobStatus;
          scheduled_at?: string | null;
          published_at?: string | null;
          response?: Json | null;
          error?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          output_package_id?: string;
          destination?: OutputPlatform;
          status?: PublishJobStatus;
          scheduled_at?: string | null;
          published_at?: string | null;
          response?: Json | null;
          error?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "publish_jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publish_jobs_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publish_jobs_output_package_id_fkey";
            columns: ["output_package_id"];
            isOneToOne: false;
            referencedRelation: "output_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      source_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          category: IntakeSourceCategory;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          category: IntakeSourceCategory;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          category?: IntakeSourceCategory;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_items: {
        Row: {
          id: string;
          organization_id: string;
          source_type_id: string;
          original_url: string | null;
          title: string | null;
          extraction_status: IntakeExtractionStatus;
          imported_at: string;
          reporter_id: string | null;
          media_asset_id: string | null;
          metadata: Json;
          extracted_content: string | null;
          extracted_metadata: Json;
          error: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_type_id: string;
          original_url?: string | null;
          title?: string | null;
          extraction_status?: IntakeExtractionStatus;
          imported_at?: string;
          reporter_id?: string | null;
          media_asset_id?: string | null;
          metadata?: Json;
          extracted_content?: string | null;
          extracted_metadata?: Json;
          error?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          source_type_id?: string;
          original_url?: string | null;
          title?: string | null;
          extraction_status?: IntakeExtractionStatus;
          imported_at?: string;
          reporter_id?: string | null;
          media_asset_id?: string | null;
          metadata?: Json;
          extracted_content?: string | null;
          extracted_metadata?: Json;
          error?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "source_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_items_source_type_id_fkey";
            columns: ["source_type_id"];
            isOneToOne: false;
            referencedRelation: "source_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_items_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      story_sources: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          source_item_id: string;
          is_primary: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          source_item_id: string;
          is_primary?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          source_item_id?: string;
          is_primary?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "story_sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_sources_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_sources_source_item_id_fkey";
            columns: ["source_item_id"];
            isOneToOne: false;
            referencedRelation: "source_items";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_workflows: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          status: AiWorkflowStatus;
          current_stage: AiProductionStage | null;
          estimated_seconds: number;
          started_at: string | null;
          finished_at: string | null;
          metadata: Json;
          error: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          status?: AiWorkflowStatus;
          current_stage?: AiProductionStage | null;
          estimated_seconds?: number;
          started_at?: string | null;
          finished_at?: string | null;
          metadata?: Json;
          error?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          status?: AiWorkflowStatus;
          current_stage?: AiProductionStage | null;
          estimated_seconds?: number;
          started_at?: string | null;
          finished_at?: string | null;
          metadata?: Json;
          error?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_workflows_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_workflows_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_workflow_tasks: {
        Row: {
          id: string;
          organization_id: string;
          workflow_id: string;
          story_id: string;
          task_type: AiWorkflowTaskType;
          stage: AiProductionStage;
          sort_order: number;
          status: AiWorkflowTaskStatus;
          provider: string | null;
          model: string | null;
          ai_job_id: string | null;
          input: Json;
          output: Json;
          output_version: number;
          estimated_seconds: number;
          error: string | null;
          started_at: string | null;
          finished_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          workflow_id: string;
          story_id: string;
          task_type: AiWorkflowTaskType;
          stage: AiProductionStage;
          sort_order?: number;
          status?: AiWorkflowTaskStatus;
          provider?: string | null;
          model?: string | null;
          ai_job_id?: string | null;
          input?: Json;
          output?: Json;
          output_version?: number;
          estimated_seconds?: number;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          workflow_id?: string;
          story_id?: string;
          task_type?: AiWorkflowTaskType;
          stage?: AiProductionStage;
          sort_order?: number;
          status?: AiWorkflowTaskStatus;
          provider?: string | null;
          model?: string | null;
          ai_job_id?: string | null;
          input?: Json;
          output?: Json;
          output_version?: number;
          estimated_seconds?: number;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_workflow_tasks_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "ai_workflows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_workflow_tasks_ai_job_id_fkey";
            columns: ["ai_job_id"];
            isOneToOne: false;
            referencedRelation: "ai_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          title: string;
          status: string;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          title?: string;
          status?: string;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          title?: string;
          status?: string;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: true;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          id: string;
          organization_id: string;
          conversation_id: string;
          story_id: string;
          role: AiMessageRole;
          content: string;
          action_type: AiWorkspaceActionType | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          conversation_id: string;
          story_id: string;
          role: AiMessageRole;
          content?: string;
          action_type?: AiWorkspaceActionType | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          conversation_id?: string;
          story_id?: string;
          role?: AiMessageRole;
          content?: string;
          action_type?: AiWorkspaceActionType | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_messages_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_workspace_outputs: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          conversation_id: string | null;
          message_id: string | null;
          action_type: AiWorkspaceActionType;
          status: AiWorkspaceOutputStatus;
          title: string;
          content: string;
          content_version: number;
          ai_job_id: string | null;
          structured: Json;
          error: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          action_type: AiWorkspaceActionType;
          status?: AiWorkspaceOutputStatus;
          title?: string;
          content?: string;
          content_version?: number;
          ai_job_id?: string | null;
          structured?: Json;
          error?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          conversation_id?: string | null;
          message_id?: string | null;
          action_type?: AiWorkspaceActionType;
          status?: AiWorkspaceOutputStatus;
          title?: string;
          content?: string;
          content_version?: number;
          ai_job_id?: string | null;
          structured?: Json;
          error?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_workspace_outputs_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_workspace_outputs_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_workspace_outputs_ai_job_id_fkey";
            columns: ["ai_job_id"];
            isOneToOne: false;
            referencedRelation: "ai_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      creative_studio_projects: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string | null;
          title: string;
          description: string;
          status: CreativeProjectStatus;
          frame_rate: number;
          resolution_width: number;
          resolution_height: number;
          duration_ms: number;
          thumbnail_url: string | null;
          settings: Json;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id?: string | null;
          title: string;
          description?: string;
          status?: CreativeProjectStatus;
          frame_rate?: number;
          resolution_width?: number;
          resolution_height?: number;
          duration_ms?: number;
          thumbnail_url?: string | null;
          settings?: Json;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string | null;
          title?: string;
          description?: string;
          status?: CreativeProjectStatus;
          frame_rate?: number;
          resolution_width?: number;
          resolution_height?: number;
          duration_ms?: number;
          thumbnail_url?: string | null;
          settings?: Json;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      creative_studio_timelines: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          title: string;
          duration_ms: number;
          zoom_level: number;
          snap_enabled: boolean;
          playhead_ms: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          title?: string;
          duration_ms?: number;
          zoom_level?: number;
          snap_enabled?: boolean;
          playhead_ms?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          project_id?: string;
          title?: string;
          duration_ms?: number;
          zoom_level?: number;
          snap_enabled?: boolean;
          playhead_ms?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creative_studio_timeline_tracks: {
        Row: {
          id: string;
          organization_id: string;
          timeline_id: string;
          kind: CreativeTrackKind;
          name: string;
          sort_order: number;
          muted: boolean;
          locked: boolean;
          height: number;
          color: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          timeline_id: string;
          kind: CreativeTrackKind;
          name: string;
          sort_order?: number;
          muted?: boolean;
          locked?: boolean;
          height?: number;
          color?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          timeline_id?: string;
          kind?: CreativeTrackKind;
          name?: string;
          sort_order?: number;
          muted?: boolean;
          locked?: boolean;
          height?: number;
          color?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creative_studio_timeline_clips: {
        Row: {
          id: string;
          organization_id: string;
          track_id: string;
          media_asset_id: string | null;
          template_id: string | null;
          name: string;
          clip_kind: CreativeClipKind;
          start_ms: number;
          end_ms: number;
          trim_start_ms: number;
          trim_end_ms: number;
          position_x: number;
          position_y: number;
          scale: number;
          rotation: number;
          opacity: number;
          volume: number;
          speed: number;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          track_id: string;
          media_asset_id?: string | null;
          template_id?: string | null;
          name: string;
          clip_kind: CreativeClipKind;
          start_ms?: number;
          end_ms?: number;
          trim_start_ms?: number;
          trim_end_ms?: number;
          position_x?: number;
          position_y?: number;
          scale?: number;
          rotation?: number;
          opacity?: number;
          volume?: number;
          speed?: number;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          track_id?: string;
          media_asset_id?: string | null;
          template_id?: string | null;
          name?: string;
          clip_kind?: CreativeClipKind;
          start_ms?: number;
          end_ms?: number;
          trim_start_ms?: number;
          trim_end_ms?: number;
          position_x?: number;
          position_y?: number;
          scale?: number;
          rotation?: number;
          opacity?: number;
          volume?: number;
          speed?: number;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      creative_studio_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string;
          category: string;
          thumbnail_url: string | null;
          aspect_ratio: string;
          duration_ms: number;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string;
          category?: string;
          thumbnail_url?: string | null;
          aspect_ratio?: string;
          duration_ms?: number;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string;
          category?: string;
          thumbnail_url?: string | null;
          aspect_ratio?: string;
          duration_ms?: number;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      creative_studio_template_placeholders: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          kind: CreativePlaceholderKind;
          label: string;
          sort_order: number;
          default_value: string;
          constraints: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          template_id: string;
          kind: CreativePlaceholderKind;
          label: string;
          sort_order?: number;
          default_value?: string;
          constraints?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          template_id?: string;
          kind?: CreativePlaceholderKind;
          label?: string;
          sort_order?: number;
          default_value?: string;
          constraints?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      story_packages: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          title: string;
          status: StoryPackageStatus;
          master_template_id: string | null;
          master_template_code: string | null;
          scene_count: number;
          total_duration_ms: number;
          voice_duration_ms: number | null;
          ai_metadata: Json;
          history: Json;
          error: string | null;
          built_at: string | null;
          built_by: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          title: string;
          status?: StoryPackageStatus;
          master_template_id?: string | null;
          master_template_code?: string | null;
          scene_count?: number;
          total_duration_ms?: number;
          voice_duration_ms?: number | null;
          ai_metadata?: Json;
          history?: Json;
          error?: string | null;
          built_at?: string | null;
          built_by?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          title?: string;
          status?: StoryPackageStatus;
          master_template_id?: string | null;
          master_template_code?: string | null;
          scene_count?: number;
          total_duration_ms?: number;
          voice_duration_ms?: number | null;
          ai_metadata?: Json;
          history?: Json;
          error?: string | null;
          built_at?: string | null;
          built_by?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      story_voice_segments: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          package_id: string;
          sort_order: number;
          label: string;
          text: string;
          start_ms: number;
          end_ms: number;
          duration_ms: number;
          headline: string | null;
          subheadline: string | null;
          body_text: string | null;
          media_kind: string;
          media_ref: string;
          media_caption: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          package_id: string;
          sort_order?: number;
          label?: string;
          text: string;
          start_ms?: number;
          end_ms?: number;
          duration_ms?: number;
          headline?: string | null;
          subheadline?: string | null;
          body_text?: string | null;
          media_kind?: string;
          media_ref?: string;
          media_caption?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          package_id?: string;
          sort_order?: number;
          label?: string;
          text?: string;
          start_ms?: number;
          end_ms?: number;
          duration_ms?: number;
          headline?: string | null;
          subheadline?: string | null;
          body_text?: string | null;
          media_kind?: string;
          media_ref?: string;
          media_caption?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      story_scene_instances: {
        Row: {
          id: string;
          organization_id: string;
          package_id: string;
          story_id: string;
          master_template_id: string;
          scene_id: string;
          voice_segment_id: string | null;
          sort_order: number;
          timeline_order: number;
          name: string;
          status: StorySceneInstanceStatus;
          duration_ms: number;
          headline: string;
          subheadline: string;
          body_text: string;
          video_asset_ref: string;
          image_asset_ref: string;
          logo_ref: string;
          advertisement_ref: string;
          animations: Json;
          behaviors: Json;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          package_id: string;
          story_id: string;
          master_template_id: string;
          scene_id: string;
          voice_segment_id?: string | null;
          sort_order?: number;
          timeline_order?: number;
          name: string;
          status?: StorySceneInstanceStatus;
          duration_ms?: number;
          headline?: string;
          subheadline?: string;
          body_text?: string;
          video_asset_ref?: string;
          image_asset_ref?: string;
          logo_ref?: string;
          advertisement_ref?: string;
          animations?: Json;
          behaviors?: Json;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          package_id?: string;
          story_id?: string;
          master_template_id?: string;
          scene_id?: string;
          voice_segment_id?: string | null;
          sort_order?: number;
          timeline_order?: number;
          name?: string;
          status?: StorySceneInstanceStatus;
          duration_ms?: number;
          headline?: string;
          subheadline?: string;
          body_text?: string;
          video_asset_ref?: string;
          image_asset_ref?: string;
          logo_ref?: string;
          advertisement_ref?: string;
          animations?: Json;
          behaviors?: Json;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      story_asset_discovery_runs: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          status: AssetDiscoveryRunStatus;
          panel_count: number;
          preferred_provider: AssetDiscoveryProvider | null;
          ai_metadata: Json;
          history: Json;
          error: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          status?: AssetDiscoveryRunStatus;
          panel_count?: number;
          preferred_provider?: AssetDiscoveryProvider | null;
          ai_metadata?: Json;
          history?: Json;
          error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          status?: AssetDiscoveryRunStatus;
          panel_count?: number;
          preferred_provider?: AssetDiscoveryProvider | null;
          ai_metadata?: Json;
          history?: Json;
          error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      story_panel_asset_searches: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          run_id: string;
          panel_index: number;
          scene_headline: string;
          story_headline: string;
          keywords: Json;
          expanded_keywords: Json;
          queries: Json;
          providers_queried: string[];
          context: Json;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          run_id: string;
          panel_index: number;
          scene_headline?: string;
          story_headline?: string;
          keywords?: Json;
          expanded_keywords?: Json;
          queries?: Json;
          providers_queried?: string[];
          context?: Json;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          run_id?: string;
          panel_index?: number;
          scene_headline?: string;
          story_headline?: string;
          keywords?: Json;
          expanded_keywords?: Json;
          queries?: Json;
          providers_queried?: string[];
          context?: Json;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      story_panel_asset_candidates: {
        Row: {
          id: string;
          organization_id: string;
          story_id: string;
          run_id: string;
          search_id: string | null;
          panel_index: number;
          provider: AssetDiscoveryProvider;
          provider_asset_id: string | null;
          media_asset_id: string | null;
          asset_kind: AssetDiscoveryKind;
          title: string;
          thumbnail_url: string | null;
          preview_url: string | null;
          source_url: string | null;
          license_info: string;
          resolution: string;
          aspect_ratio: string;
          orientation: string;
          relevance_score: number;
          confidence: number;
          rank: number;
          status: AssetDiscoveryDecision;
          decided_by: string | null;
          decided_at: string | null;
          decision_note: string | null;
          metadata: Json;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          story_id: string;
          run_id: string;
          search_id?: string | null;
          panel_index: number;
          provider: AssetDiscoveryProvider;
          provider_asset_id?: string | null;
          media_asset_id?: string | null;
          asset_kind?: AssetDiscoveryKind;
          title?: string;
          thumbnail_url?: string | null;
          preview_url?: string | null;
          source_url?: string | null;
          license_info?: string;
          resolution?: string;
          aspect_ratio?: string;
          orientation?: string;
          relevance_score?: number;
          confidence?: number;
          rank?: number;
          status?: AssetDiscoveryDecision;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          metadata?: Json;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          story_id?: string;
          run_id?: string;
          search_id?: string | null;
          panel_index?: number;
          provider?: AssetDiscoveryProvider;
          provider_asset_id?: string | null;
          media_asset_id?: string | null;
          asset_kind?: AssetDiscoveryKind;
          title?: string;
          thumbnail_url?: string | null;
          preview_url?: string | null;
          source_url?: string | null;
          license_info?: string;
          resolution?: string;
          aspect_ratio?: string;
          orientation?: string;
          relevance_score?: number;
          confidence?: number;
          rank?: number;
          status?: AssetDiscoveryDecision;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          metadata?: Json;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_org_permission: {
        Args: { org_id: string; permission_code: string };
        Returns: boolean;
      };
      get_user_org_role_slug: {
        Args: { org_id: string };
        Returns: string;
      };
      bootstrap_personal_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: string;
      };
      storage_org_id: {
        Args: { object_name: string };
        Returns: string;
      };
      can_access_storage_object: {
        Args: { object_name: string };
        Returns: boolean;
      };
    };
    Enums: {
      membership_status: MembershipStatus;
      story_status: StoryStatus;
      story_voice_status: StoryVoiceStatus;
      story_package_status: StoryPackageStatus;
      story_scene_instance_status: StorySceneInstanceStatus;
      asset_discovery_run_status: AssetDiscoveryRunStatus;
      asset_discovery_provider: AssetDiscoveryProvider;
      asset_discovery_kind: AssetDiscoveryKind;
      asset_discovery_decision: AssetDiscoveryDecision;
      story_priority: StoryPriority;
      media_file_type: MediaFileType;
      media_storage_scope: MediaStorageScope;
      content_object_type: ContentObjectType;
      content_object_status: ContentObjectStatus;
      output_platform: OutputPlatform;
      output_package_status: OutputPackageStatus;
      ai_job_status: AiJobStatus;
      render_job_status: RenderJobStatus;
      publish_job_status: PublishJobStatus;
      intake_extraction_status: IntakeExtractionStatus;
      intake_source_category: IntakeSourceCategory;
      ai_workflow_status: AiWorkflowStatus;
      ai_workflow_task_type: AiWorkflowTaskType;
      ai_workflow_task_status: AiWorkflowTaskStatus;
      ai_production_stage: AiProductionStage;
      ai_message_role: AiMessageRole;
      ai_workspace_action_type: AiWorkspaceActionType;
      ai_workspace_output_status: AiWorkspaceOutputStatus;
      creative_project_status: CreativeProjectStatus;
      creative_track_kind: CreativeTrackKind;
      creative_clip_kind: CreativeClipKind;
      creative_placeholder_kind: CreativePlaceholderKind;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
