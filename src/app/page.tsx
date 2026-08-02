import { redirect } from "next/navigation";

import { createClient } from "@/shared/lib/supabase/server";
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  DEFAULT_UNAUTHENTICATED_ROUTE,
} from "@/shared/config/constants";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? DEFAULT_AUTHENTICATED_ROUTE : DEFAULT_UNAUTHENTICATED_ROUTE);
}
