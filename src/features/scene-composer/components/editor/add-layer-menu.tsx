"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayerFactory,
  LAYER_CATEGORY_LABELS,
  type LayerKind,
} from "@/features/scene-composer/lib/layer-factory";

type AddLayerMenuProps = {
  disabled?: boolean;
  onAddLayer: (kind: LayerKind) => void;
  /** Compact icon+label for the Layers panel; full label for the menu bar. */
  variant?: "panel" | "toolbar";
  align?: "start" | "end";
};

/**
 * Feature 042 — single entry point for every creatable layer kind.
 * Never creates a Rectangle unless the user picks Rectangle.
 */
export function AddLayerMenu({
  disabled = false,
  onAddLayer,
  variant = "panel",
  align = "end",
}: AddLayerMenuProps) {
  const groups = LayerFactory.getMenu();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 gap-1 px-2"
            disabled={disabled}
            title="Add layer"
          />
        }
      >
        <Plus className="size-3.5" />
        {variant === "toolbar" ? "Add Layer" : "Add"}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="max-h-[min(70vh,560px)] w-56 overflow-y-auto"
      >
        {groups.map((group, index) => (
          <DropdownMenuGroup key={group.category}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {LAYER_CATEGORY_LABELS[group.category]}
            </DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem
                key={item.kind}
                onClick={() => onAddLayer(item.kind)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
