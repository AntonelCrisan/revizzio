import {
  AccountDashboard,
  type FlashcardPanelMode,
  type TabId,
} from "@/components/account/account-dashboard";

type AccountTabSearchParams = Promise<{
  project?: string | string[] | undefined;
  from?: string | string[] | undefined;
}>;

function getProjectId(project: string | string[] | undefined) {
  return typeof project === "string" ? project : undefined;
}

function getChatBackTab(from: string | string[] | undefined): TabId | undefined {
  if (typeof from !== "string") {
    return undefined;
  }

  return ["rezumat", "flashcards", "quiz", "strategii", "progres"].includes(
    from,
  )
    ? (from as TabId)
    : undefined;
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
