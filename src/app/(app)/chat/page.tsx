import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getChatOverview, getChatMessages } from "@/lib/chat";
import { getUserTeams } from "@/lib/permissions";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const overview = await getChatOverview(user);
  const teams = await getUserTeams(user.id);
  const initialMessages = overview.latestSession ? await getChatMessages(overview.latestSession.id, user) : [];

  return (
    <ChatWorkspace
      userName={user.displayName}
      sessions={overview.sessions}
      initialMessages={initialMessages as any}
      teams={teams}
      initialSessionId={overview.latestSession?.id ?? null}
    />
  );
}

