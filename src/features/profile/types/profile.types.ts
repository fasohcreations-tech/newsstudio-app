import type { Tables } from "@/shared/types/database.types";

export type Profile = Tables<"profiles">;

export type ProfileSummary = Pick<
  Profile,
  "id" | "email" | "full_name" | "avatar_url"
>;
