import {
  AccountDashboard,
  type FlashcardPanelMode,
  type TabId,
} from "@/components/account/account-dashboard";

type AccountTabSearchParams = Promise<{
  project?: string | string[] | undefined;
  from?: string | string[] | undefined;
}>;

const chatBackTabs = [
  "rezumat",
  "flashcards",
  "quiz",
  "strategii",
  "progres",
] as const satisfies readonly TabId[];

type ChatBackTab = (typeof chatBackTabs)[number];

function isChatBackTab(value: string): value is ChatBackTab {
  return (chatBackTabs as readonly string[]).includes(value);
}

function getSearchParamValue(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const cleanValue = firstValue?.trim();

  return cleanValue || undefined;
}

function getProjectId(project: string | string[] | undefined) {
  return getSearchParamValue(project);
}

function getChatBackTab(from: string | string[] | undefined): TabId | undefined {
  const tab = getSearchParamValue(from);

  return tab && isChatBackTab(tab) ? tab : undefined;
}

export async function AccountTabRoutePage({
  searchParams,
  tab,
  flashcardMode = "packages",
}: {
  searchParams: AccountTabSearchParams;
  tab: TabId;
  flashcardMode?: FlashcardPanelMode;
}) {
  const params = await searchParams;

  return (
    <AccountDashboard
      initialProjectId={getProjectId(params.project)}
      initialTab={tab}
      initialChatBackTab={getChatBackTab(params.from)}
      initialFlashcardMode={flashcardMode}
      initialView="project"
      useTabPages
    />
  );
}
