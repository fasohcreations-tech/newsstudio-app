import type { Metadata } from "next";

import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { requireGuest } from "@/features/auth/guards/require-auth";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignUpPage() {
  await requireGuest();
  return <SignUpForm />;
}
