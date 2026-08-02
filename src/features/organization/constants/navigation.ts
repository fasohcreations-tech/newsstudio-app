/**
 * Organization navigation foundation.
 * Full management UI lands in a later feature; these routes reserve the IA.
 */
export const ORGANIZATION_NAV_ITEMS = [
  {
    title: "Organization overview",
    href: "/administration/organization",
    description: "Organization profile and workspace context",
  },
  {
    title: "Workspaces",
    href: "/administration/workspaces",
    description: "Workspace foundation for multi-desk operations",
  },
  {
    title: "Members",
    href: "/administration/members",
    description: "Membership and role assignments",
  },
] as const;
