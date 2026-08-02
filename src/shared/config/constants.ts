export const APP_NAME = "MediaOS";

export const APP_DESCRIPTION =
  "Enterprise AI-powered Media Operating System";

/** Routes that do not require authentication */
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
] as const;

/** Default landing route after successful authentication */
export const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";

/** Default landing route for unauthenticated users */
export const DEFAULT_UNAUTHENTICATED_ROUTE = "/login";
