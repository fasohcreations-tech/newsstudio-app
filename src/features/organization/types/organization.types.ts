import type { Tables } from "@/shared/types/database.types";

export type Organization = Tables<"organizations">;
export type Workspace = Tables<"workspaces">;
export type OrganizationMember = Tables<"organization_members">;
export type Role = Tables<"roles">;
export type Permission = Tables<"permissions">;

export type OrganizationMembership = OrganizationMember & {
  organization: Pick<Organization, "id" | "name" | "slug" | "logo_url">;
  role: Pick<Role, "id" | "name" | "slug">;
  default_workspace: Pick<Workspace, "id" | "name" | "slug"> | null;
};
