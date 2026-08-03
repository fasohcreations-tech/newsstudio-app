"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryFormField } from "@/features/story-production/components/form/story-form-field";
import { SubHeadlineSlotsEditor } from "@/features/story-production/components/form/sub-headline-slots-editor";
import { MalayalamFontSelect } from "@/features/story-production/components/form/malayalam-font-select";
import { Label } from "@/components/ui/label";
import {
  GENERAL_FORM_FIELDS,
  MEDIA_FORM_FIELDS,
  STORY_FORM_SECTIONS,
  TEXT_FORM_FIELDS,
  THEME_FORM_FIELDS,
} from "@/features/story-production/constants/story-data.constants";
import {
  applySubHeadlineMediaToStoryDataFields,
  collectSubHeadlineSlots,
  readSubHeadlineMediaFromStoryData,
  SUB_HEADLINE_FIELD_KEYS,
} from "@/features/story-production/lib/sub-headlines";
import type { StoryDataRecord } from "@/features/story-production/types/story-data.types";

type StoryDataFormPanelProps = {
  data: StoryDataRecord;
  organizationId?: string | null;
  storyId?: string | null;
  onFieldChange: <K extends keyof StoryDataRecord>(
    key: K,
    value: StoryDataRecord[K],
  ) => void;
  onFieldsPatch?: (patch: Partial<StoryDataRecord>) => void;
};

const SUB_HEADLINE_KEY_SET = new Set<string>(SUB_HEADLINE_FIELD_KEYS);

export function StoryDataFormPanel({
  data,
  organizationId,
  storyId,
  onFieldChange,
  onFieldsPatch,
}: StoryDataFormPanelProps) {
  function patchFields(patch: Partial<StoryDataRecord>) {
    if (onFieldsPatch) {
      onFieldsPatch(patch);
      return;
    }
    for (const [key, value] of Object.entries(patch)) {
      onFieldChange(
        key as keyof StoryDataRecord,
        value as StoryDataRecord[keyof StoryDataRecord],
      );
    }
  }

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
              {GENERAL_FORM_FIELDS.map((field) => {
                if (field.key === "sub_headline_1") {
                  return (
                    <div key="sub-headlines" className="space-y-2">
                      <Label className="text-xs">Sub Headlines</Label>
                      <SubHeadlineSlotsEditor
                        texts={collectSubHeadlineSlots(data)}
                        media={readSubHeadlineMediaFromStoryData(data)}
                        organizationId={organizationId}
                        storyId={storyId}
                        onTextsChange={(texts) => {
                          patchFields({
                            sub_headline_1: texts[0] ?? "",
                            sub_headline_2: texts[1] ?? "",
                            sub_headline_3: texts[2] ?? "",
                            sub_headline_4: texts[3] ?? "",
                          });
                        }}
                        onMediaChange={(media) => {
                          patchFields(
                            applySubHeadlineMediaToStoryDataFields(
                              media,
                            ) as Partial<StoryDataRecord>,
                          );
                        }}
                      />
                    </div>
                  );
                }
                if (SUB_HEADLINE_KEY_SET.has(field.key)) {
                  return null;
                }
                return (
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
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                Sub Headlines rotate in the lower information panel. Link
                image, video, or caption media on each slot for scene building.
              </p>
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
