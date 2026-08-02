"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/shared/lib/supabase/client";
import { signOut } from "@/features/auth/services/auth.service";
import { DEFAULT_UNAUTHENTICATED_ROUTE } from "@/shared/config/constants";

type LogoutButtonProps = {
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive";
  className?: string;
  showLabel?: boolean;
};

export function LogoutButton({
  variant = "ghost",
  className,
  showLabel = true,
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const result = await signOut(supabase);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Signed out");
    router.replace(DEFAULT_UNAUTHENTICATED_ROUTE);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleLogout}
    >
      <LogOut />
      {showLabel ? "Sign out" : <span className="sr-only">Sign out</span>}
    </Button>
  );
}
