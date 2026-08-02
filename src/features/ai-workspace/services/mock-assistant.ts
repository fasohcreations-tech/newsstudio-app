import {
  AI_WORKSPACE_ACTION_LABELS,
  AI_WORKSPACE_ACTION_TO_PRODUCTION_TASK,
  type AIWorkspaceSuggestedAction,
} from "@/features/ai-workspace/constants/workspace.constants";
import { runMockProductionTask } from "@/features/ai-production/services/mock-task-runner";
import type { StoryAIContext } from "@/features/ai-workspace/types/workspace.types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMalayalam(language?: string | null) {
  return (language ?? "ml").toLowerCase().startsWith("ml");
}

/**
 * Mock Story Assistant — prefers Malayalam for MediaOS newsroom.
 */
export async function runMockAssistantReply(
  context: StoryAIContext,
  userMessage: string,
): Promise<string> {
  await sleep(280 + Math.floor(Math.random() * 220));

  const title = context.storyTitle || "ശീർഷകമില്ലാത്ത വാർത്ത";
  const summary =
    context.storySummary?.trim() ||
    "സംഗ്രഹം ഇില്ല — സ്റ്റോറി മെറ്റാഡാറ്റയിൽ ചേർക്കുക.";
  const prompt = userMessage.trim();

  if (isMalayalam(context.language)) {
    return [
      `ഞാൻ “${title}” എന്ന വാർത്തയുടെ സ്റ്റോറി അസിസ്റ്റന്റാണ്.`,
      "",
      `സന്ദർഭം: ${summary}`,
      "",
      `നിങ്ങൾ ചോദിച്ചത്: “${prompt}”`,
      "",
      "ഇതൊരു മോക്ക് മറുപടിയാണ്. യഥാർത്ഥ ജനറേഷന് AI Producer ടാബ് ഉപയോഗിക്കുക (Gemini).",
      "Suggested Tasks മുഖേനയുള്ള ഔട്ട്പുട്ടുകൾ Outputs-ൽ അംഗീകരിക്കാം.",
    ].join("\n");
  }

  return [
    `I'm the Story Assistant for **${title}**.`,
    "",
    `Story context: ${summary}`,
    "",
    `You asked: “${prompt}”`,
    "",
    "This is a mock reply. Use the AI Producer tab for live Gemini generation.",
  ].join("\n");
}

export async function runMockWorkspaceAction(
  action: AIWorkspaceSuggestedAction,
  context: StoryAIContext,
): Promise<{ title: string; content: string; structured: Record<string, unknown> }> {
  const productionTask = AI_WORKSPACE_ACTION_TO_PRODUCTION_TASK[action];
  const language = isMalayalam(context.language) ? "ml" : context.language;

  if (productionTask) {
    const mock = await runMockProductionTask(productionTask, {
      storyTitle: context.storyTitle,
      storySummary: context.storySummary,
      language,
    });
    return {
      title: mock.title,
      content: mock.body,
      structured: (mock.extras ?? {}) as Record<string, unknown>,
    };
  }

  await sleep(320 + Math.floor(Math.random() * 180));
  const title = context.storyTitle || "Untitled story";

  if (isMalayalam(context.language)) {
    return {
      title: `വസ്തുതാ പരിശോധന — ${title}`,
      content: [
        `“${title}” എന്ന വാർത്തയുടെ വസ്തുതാ പരിശോധന (മോക്ക്)`,
        "",
        "പരിശോധിച്ച ക്ലെയിമുകൾ:",
        "1. പ്രധാന ക്ലെയിം — ഉറവിടം ഉറപ്പാക്കുക",
        "2. ആട്രിബ്യൂഷൻ — സ്പീക്കർ / ഏജൻസി സ്ഥിരീകരിക്കുക",
        "3. അക്കങ്ങൾ / തീയതികൾ — വയർ കോപ്പിയുമായി ഒത്തുനോക്കുക",
        "",
        "സ്റ്റാറ്റസ്: മോക്ക് റിവ്യൂ പൂർത്തിയായി. തത്സമയ പരിശോധനയ്ക്ക് ദാതാവ് ബന്ധിപ്പിക്കുക.",
      ].join("\n"),
      structured: {
        mock: true,
        action,
        label: AI_WORKSPACE_ACTION_LABELS[action],
        language: "ml",
      },
    };
  }

  return {
    title: `Fact check — ${title}`,
    content: [
      `Fact-check draft for “${title}”`,
      "",
      "Claims reviewed (mock):",
      "1. Primary claim — Needs source verification",
      "2. Attribution — Confirm speaker / agency",
      "3. Numbers / dates — Cross-check against wire copy",
    ].join("\n"),
    structured: {
      mock: true,
      action,
      label: AI_WORKSPACE_ACTION_LABELS[action],
    },
  };
}

export function systemWelcomeMessage(context: StoryAIContext): string {
  if (isMalayalam(context.language)) {
    return [
      `“${context.storyTitle || "വാർത്ത"}” എന്നതിനുള്ള സ്റ്റോറി അസിസ്റ്റന്റ് തയ്യാറാണ്.`,
      "ചോദ്യം ചോദിക്കുക അല്ലെങ്കിൽ Suggested Task തിരഞ്ഞെടുക്കുക.",
      "തത്സമയ മലയാളം ജനറേഷന് AI Producer ടാബ് ഉപയോഗിക്കുക.",
    ].join(" ");
  }

  return [
    `Story Assistant ready for “${context.storyTitle || "Untitled story"}”.`,
    "Ask a question or pick a suggested task.",
    "Use the AI Producer tab for live Malayalam Gemini generation.",
  ].join(" ");
}
