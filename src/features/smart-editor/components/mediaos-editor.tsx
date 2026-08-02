"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/features/smart-editor/components/toolbar";
import { LanguageToolbar } from "@/features/smart-editor/components/language-toolbar";
import { VoiceToolbar } from "@/features/smart-editor/components/voice-toolbar";
import { HandwritingPanel } from "@/features/smart-editor/components/handwriting-panel";
import { SuggestionPanel } from "@/features/smart-editor/components/suggestion-panel";
import { AIActionPanel } from "@/features/smart-editor/components/ai-action-panel";
import { StatusBar } from "@/features/smart-editor/components/status-bar";
import { FindReplaceDialog } from "@/features/smart-editor/components/find-replace-dialog";
import { ManglishCandidatePopup } from "@/features/smart-editor/components/manglish-candidate-popup";
import { useMediaOSEditor } from "@/features/smart-editor/hooks/use-editor";
import { useManglish } from "@/features/smart-editor/hooks/use-manglish";
import { useVoiceInput } from "@/features/smart-editor/hooks/use-voice-input";
import { useAutoSave } from "@/features/smart-editor/hooks/use-auto-save";
import { useEditorHistory } from "@/features/smart-editor/hooks/use-editor-history";
import { useKeyboardShortcut } from "@/features/platform/hooks/use-keyboard-shortcut";
import type {
  MediaOSEditorProps,
  NewsroomFormat,
} from "@/features/smart-editor/types/editor.types";
import type { SpeechLocale } from "@/features/smart-editor/services/interfaces/editor-services";
import {
  countWords,
  estimateReadingTimeMinutes,
  htmlToPlainText,
} from "@/features/smart-editor/lib/text-metrics";

/**
 * MediaOSEditor — Universal Smart Malayalam Editor.
 * Reusable across Story Script, articles, captions, and future text surfaces.
 */
export function MediaOSEditor({
  storyId,
  contentObjectId,
  initialHtml,
  initialLanguage,
  placeholder,
  disabled,
  variant = "full",
  settings: settingsPatch,
  onChange,
  onSave,
  className,
}: MediaOSEditorProps) {
  const [findOpen, setFindOpen] = useState(false);
  const [findMode, setFindMode] = useState<"find" | "replace">("find");
  const [showVoice, setShowVoice] = useState(variant === "full");
  const [showHandwriting, setShowHandwriting] = useState(false);
  const [showAi, setShowAi] = useState(variant === "full");
  const [speechLocale, setSpeechLocale] = useState<SpeechLocale>("mixed");
  const [newsroomFormat, setNewsroomFormat] = useState<NewsroomFormat>(
    settingsPatch?.newsroomFormat ?? "website_article",
  );
  const [metrics, setMetrics] = useState({
    wordCount: 0,
    characterCount: 0,
    readingTimeMinutes: 0,
  });

  const {
    editor,
    settings,
    language,
    setLanguage,
    revision,
    dirty,
    lastSavedAt,
    editorVersion,
    getPayload,
    markSaved,
    insertTextAtCursor,
    replaceSelection,
    getSelectedText,
    getDocumentText,
  } = useMediaOSEditor({
    initialHtml,
    placeholder,
    disabled,
    language: initialLanguage,
    settings: settingsPatch,
    onChange: (payload) => {
      setMetrics({
        wordCount: payload.wordCount,
        characterCount: payload.characterCount,
        readingTimeMinutes: payload.readingTimeMinutes,
      });
      onChange?.(payload);
    },
  });

  const manglish = useManglish({
    editor,
    enabled: settings.enableManglish,
    autoTransliteration: settings.autoTransliteration,
  });

  const voice = useVoiceInput({
    locale: speechLocale,
    enabled: settings.enableVoiceDictation,
    onFinalTranscript: (text) => {
      if (!text.trim()) return;
      insertTextAtCursor(text.trim() + " ");
      toast.success("Transcript inserted");
    },
  });

  const { entries: historyEntries, pushSnapshot } = useEditorHistory();

  const persist = useCallback(
    async (payload: NonNullable<ReturnType<typeof getPayload>>) => {
      if (onSave) {
        await onSave(payload);
      }
      pushSnapshot(payload.contentHtml, payload.revision, "Autosave");
      markSaved();
    },
    [markSaved, onSave, pushSnapshot],
  );

  const autoSave = useAutoSave({
    enabled: settings.autoSave && Boolean(onSave),
    dirty,
    getPayload,
    onSave: async (payload) => {
      await persist(payload);
    },
  });

  const manglishKeyHandler = useRef(manglish.handleKeyDown);
  manglishKeyHandler.current = manglish.handleKeyDown;

  useEffect(() => {
    if (!editor) return;
    const handler = (event: KeyboardEvent) => {
      manglishKeyHandler.current(event);
    };
    const dom = editor.view.dom;
    dom.addEventListener("keydown", handler, true);
    return () => dom.removeEventListener("keydown", handler, true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const plain = htmlToPlainText(editor.getHTML());
    setMetrics({
      wordCount: countWords(plain),
      characterCount: plain.length,
      readingTimeMinutes: estimateReadingTimeMinutes(countWords(plain)),
    });
  }, [editor]);

  useKeyboardShortcut("ctrl+s", () => {
    void autoSave.saveNow();
  }, { allowInInputs: true });

  useKeyboardShortcut("ctrl+f", () => {
    setFindMode("find");
    setFindOpen(true);
  }, { allowInInputs: true });

  useKeyboardShortcut("ctrl+h", () => {
    setFindMode("replace");
    setFindOpen(true);
  }, { allowInInputs: true });

  useKeyboardShortcut("ctrl+k", () => {
    if (!editor) return;
    const href = window.prompt("Link URL");
    if (!href) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, { allowInInputs: true });

  const sourceText = useCallback(() => {
    const selected = getSelectedText().trim();
    return selected || getDocumentText();
  }, [getDocumentText, getSelectedText]);

  const compact = variant === "compact" || variant === "embedded";
  const showSidebars = variant === "full";

  const shellStyle = useMemo(
    () =>
      ({
        ["--editor-font-size" as string]: `${settings.fontSize}px`,
        ["--editor-line-height" as string]: String(settings.lineHeight),
      }) as React.CSSProperties,
    [settings.fontSize, settings.lineHeight],
  );

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-[24rem] animate-pulse rounded-xl border border-border/60 bg-muted/20",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background",
        variant === "full" && "min-h-[36rem]",
        className,
      )}
      style={shellStyle}
      data-editor-theme={settings.theme}
    >
      <Toolbar
        editor={editor}
        layout={compact ? "compact" : settings.toolbarLayout}
        onFind={() => {
          setFindMode("find");
          setFindOpen(true);
        }}
        onLink={() => {
          const href = window.prompt("Link URL");
          if (!href) return;
          editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }}
      />
      <LanguageToolbar
        language={language}
        onLanguageChange={setLanguage}
        manglishOn={manglish.active}
        onToggleManglish={() => manglish.setActive((v) => !v)}
        autoTransliteration={settings.autoTransliteration}
        onConvertSelection={() => void manglish.convertSelection()}
        newsroomFormat={newsroomFormat}
        onFormatChange={setNewsroomFormat}
      />

      {!showSidebars ? (
        <div className="flex flex-wrap gap-1 border-b border-border/50 px-2 py-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowVoice((v) => !v)}
          >
            Voice
          </Button>
          {settings.enableHandwriting ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowHandwriting((v) => !v)}
            >
              Handwriting
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setShowAi((v) => !v)}
          >
            AI
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => void autoSave.saveNow()}
          >
            Save
          </Button>
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-h-0 flex-1",
          showSidebars
            ? "lg:grid-cols-[minmax(0,1fr)_18rem]"
            : "grid-cols-1",
        )}
      >
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <EditorContent editor={editor} />
          </div>
          {manglish.active ? (
            <ManglishCandidatePopup
              popup={manglish.popup}
              onSelect={(candidate) => manglish.applyCandidate(candidate)}
              onHover={(index) => manglish.setActiveIndex(index)}
            />
          ) : null}
          {(showVoice && !showSidebars) || (showHandwriting && !showSidebars) ? (
            <div className="space-y-2 border-t border-border/50 p-3">
              {showVoice ? (
                <VoiceToolbar
                  state={voice.state}
                  liveTranscript={voice.liveTranscript}
                  locale={speechLocale}
                  error={voice.error}
                  onLocaleChange={setSpeechLocale}
                  onStart={() => void voice.start()}
                  onPause={() => void voice.pause()}
                  onResume={() => void voice.resume()}
                  onStop={() => void voice.stop()}
                  onCancel={() => void voice.cancel()}
                />
              ) : null}
              {showHandwriting ? (
                <HandwritingPanel
                  locale={language === "en" ? "en" : "ml"}
                  onInsert={(text) => insertTextAtCursor(text + " ")}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {showSidebars ? (
          <aside className="flex min-h-0 flex-col gap-4 overflow-auto border-t border-border/60 p-3 lg:border-t-0 lg:border-l">
            <AIActionPanel
              language={language}
              storyId={storyId}
              contentObjectId={contentObjectId}
              getSourceText={sourceText}
              onApply={(text) => {
                if (getSelectedText()) replaceSelection(text);
                else insertTextAtCursor(text);
              }}
            />
            <VoiceToolbar
              state={voice.state}
              liveTranscript={voice.liveTranscript}
              locale={speechLocale}
              error={voice.error}
              onLocaleChange={setSpeechLocale}
              onStart={() => void voice.start()}
              onPause={() => void voice.pause()}
              onResume={() => void voice.resume()}
              onStop={() => void voice.stop()}
              onCancel={() => void voice.cancel()}
            />
            {settings.enableHandwriting ? (
              <HandwritingPanel
                locale={language === "en" ? "en" : "ml"}
                onInsert={(text) => insertTextAtCursor(text + " ")}
              />
            ) : null}
            <SuggestionPanel
              text={getDocumentText()}
              language={language === "en" ? "en" : "ml"}
              onApply={(s) => insertTextAtCursor((s.replacement ?? s.text) + " ")}
            />
            {historyEntries.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Version history
                </p>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {historyEntries.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      {entry.label} · rev {entry.revision} ·{" "}
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Version history placeholder — snapshots appear after autosave.
              </p>
            )}
          </aside>
        ) : showAi ? (
          <div className="border-t border-border/50 p-3">
            <AIActionPanel
              language={language}
              storyId={storyId}
              contentObjectId={contentObjectId}
              getSourceText={sourceText}
              onApply={(text) => {
                if (getSelectedText()) replaceSelection(text);
                else insertTextAtCursor(text);
              }}
            />
          </div>
        ) : null}
      </div>

      <StatusBar
        wordCount={metrics.wordCount}
        characterCount={metrics.characterCount}
        readingTimeMinutes={metrics.readingTimeMinutes}
        language={language}
        dirty={onSave ? dirty : false}
        saveStatus={
          onSave
            ? autoSave.status
            : dirty
              ? "idle"
              : "saved"
        }
        revision={revision}
        editorVersion={editorVersion}
        newsroomFormat={newsroomFormat}
        lastSavedAt={lastSavedAt}
      />

      <FindReplaceDialog
        open={findOpen}
        onOpenChange={setFindOpen}
        editor={editor}
        mode={findMode}
      />
    </div>
  );
}
