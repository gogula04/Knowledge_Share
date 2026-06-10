import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getChatOverview, getChatMessages } from "@/lib/chat";
import { getUserTeams } from "@/lib/permissions";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function ChatPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = (await searchParams) ?? {};
  const initialQuery = typeof params.q === "string" ? params.q.trim() : "";
  const overview = await getChatOverview(user);
  const teams = await getUserTeams(user.id);
  const initialMessages = initialQuery || !overview.latestSession ? [] : await getChatMessages(overview.latestSession.id, user);

  return (
    <ChatWorkspace
      userName={user.displayName}
      sessions={overview.sessions}
      initialMessages={initialMessages as any}
      teams={teams}
      initialSessionId={initialQuery ? null : overview.latestSession?.id ?? null}
      initialDraft={initialQuery}
      autoSubmitQuestion={Boolean(initialQuery)}
    />
  );
}
