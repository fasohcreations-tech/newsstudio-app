import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

/**
 * Neutral foundation surface for modules that are not yet implemented.
 * No fake data or simulated business logic.
 */
export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <Card className="border-dashed border-border/70 bg-muted/20 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
