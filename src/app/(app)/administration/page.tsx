import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ORGANIZATION_NAV_ITEMS } from "@/features/organization/constants/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Administration" };

export default function AdministrationPage() {
  return (
    <div>
      <PageHeader
        title="Administration"
        description="Organization, workspace, and membership foundation. Management UI is reserved for upcoming features."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {ORGANIZATION_NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="group block">
            <Card className="h-full border-border/60 transition-colors group-hover:border-foreground/20 group-hover:bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
