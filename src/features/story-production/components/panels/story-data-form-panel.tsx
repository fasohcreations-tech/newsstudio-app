"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryFormField } from "@/features/story-production/components/form/story-form-field";
import { MalayalamFontSelect } from "@/features/story-production/components/form/malayalam-font-select";
import { Label } from "@/components/ui/label";
import {
  GENERAL_FORM_FIELDS,
  MEDIA_FORM_FIELDS,
  STORY_FORM_SECTIONS,
  TEXT_FORM_FIELDS,
  THEME_FORM_FIELDS,
} from "@/features/story-production/constants/story-data.constants";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type StoryDataFormPanelProps = {
  data: StoryDataRecord;
  onFieldChange: <K extends keyof StoryDataRecord>(
    key: K,
    value: StoryDataRecord[K],
  ) => void;
};

export function StoryDataFormPanel({
  data,
  onFieldChange,
}: StoryDataFormPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 p-4">
        <p className="text-[18px] font-semibold tracking-tight">Story Data</p>
        <p className="text-[14px] text-muted-foreground">
          Edit values — preview updates instantly. No Save required.
        </p>
      </div>

      <Tabs defaultValue="general" className="min-h-0 flex-1 flex flex-col">
        <TabsList className="mx-3 mt-3 grid h-auto grid-cols-4 gap-1">
          {STORY_FORM_SECTIONS.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="px-2 text-[13px]"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {GENERAL_FORM_FIELDS.map((field) => (
                <StoryFormField
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  value={data[field.key] as string | boolean}
                  onChange={(value) =>
                    onFieldChange(
                      field.key,
                      value as StoryDataRecord[typeof field.key],
                    )
                  }
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="media" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {MEDIA_FORM_FIELDS.map((field) => (
                <StoryFormField
                  key={field.key}
                  label={field.label}
                  bindingToken={field.bindingToken}
                  value={String(data[field.key])}
                  onChange={(value) =>
                    onFieldChange(field.key, String(value))
                  }
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="text" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {TEXT_FORM_FIELDS.map((field) => (
                <StoryFormField
                  key={field.key}
                  label={field.label}
                  bindingToken={field.bindingToken}
                  type={field.type}
                  value={String(data[field.key])}
                  onChange={(value) =>
                    onFieldChange(field.key, String(value))
                  }
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="theme" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {THEME_FORM_FIELDS.map((field) =>
                field.key === "font_family" ? (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <MalayalamFontSelect
                      value={String(data.font_family ?? "")}
                      onChange={(value) => onFieldChange("font_family", value)}
                      className="h-8 text-xs"
                    />
                  </div>
                ) : (
                  <StoryFormField
                    key={field.key}
                    label={field.label}
                    type={field.type}
                    value={
                      field.type === "toggle"
                        ? Boolean(data[field.key])
                        : String(data[field.key] ?? "")
                    }
                    onChange={(value) =>
                      onFieldChange(
                        field.key,
                        (field.type === "toggle"
                          ? Boolean(value)
                          : String(value)) as StoryDataRecord[typeof field.key],
                      )
                    }
                  />
                ),
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
