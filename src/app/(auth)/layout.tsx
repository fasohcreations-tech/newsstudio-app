import { APP_NAME } from "@/shared/config/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,oklch(0.97_0_0),oklch(0.93_0_0))] px-4 py-10 dark:bg-[radial-gradient(ellipse_at_top,oklch(0.22_0_0),oklch(0.145_0_0))]">
      <div className="mb-8 text-center">
        <p className="text-2xl font-semibold tracking-tight">{APP_NAME}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise Media Operating System
        </p>
      </div>
      {children}
    </div>
  );
}
