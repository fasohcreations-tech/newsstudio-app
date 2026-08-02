import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PUBLISHING_TARGETS } from "@/features/story-workspace/constants/workspace-tabs";

export function PublishingTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Publishing targets</h2>
        <p className="text-sm text-muted-foreground">
          Destinations are listed for planning. Publishing workflows are not enabled yet.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {PUBLISHING_TARGETS.map((target) => (
          <Card key={target.id} className="border-dashed border-border/70 bg-muted/20 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{target.label}</CardTitle>
              <CardDescription>{target.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
