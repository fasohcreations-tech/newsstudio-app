import { ModulePlaceholder } from "@/shared/components/layout/module-placeholder";

type WorkspacePlaceholderTabProps = {
  title: string;
  description: string;
};

export function WorkspacePlaceholderTab({
  title,
  description,
}: WorkspacePlaceholderTabProps) {
  return <ModulePlaceholder title={title} description={description} />;
}
