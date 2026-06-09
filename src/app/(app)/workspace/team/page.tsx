import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserTeams, userCanManageTeam } from "@/lib/permissions";
import { listResources } from "@/lib/resources";
import { query } from "@/lib/db";
import { WorkspaceAdmin } from "@/components/workspace/workspace-admin";

type PageProps = {
  searchParams?: Promise<{
    teamId?: string;
  }>;
};

export default async function TeamWorkspacePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const teams = await getUserTeams(user.id);
  if (!teams.length) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};
  const selectedTeamId = params.teamId && teams.some((team) => team.id === params.teamId) ? params.teamId : teams[0].id;
  const canManage = await userCanManageTeam(user, selectedTeamId);
  if (!canManage && user.role !== "admin") {
    redirect("/dashboard");
  }
  const resources = await listResources(user, { workspaceType: "team", teamId: selectedTeamId, limit: 100 });
  let members: {
    user_id: string;
    email: string;
    display_name: string;
    is_lead: boolean;
    member_title: string | null;
  }[] = [];
  try {
    members = await query<{
      user_id: string;
      email: string;
      display_name: string;
      is_lead: boolean;
      member_title: string | null;
    }>(
      `select u.id as user_id, u.email, u.display_name, ut.is_lead, ut.member_title
       from user_teams ut
       join users u on u.id = ut.user_id
       where ut.team_id = $1
       order by ut.is_lead desc, u.display_name asc`,
      [selectedTeamId]
    );
  } catch {
    members = [];
  }

  return <WorkspaceAdmin workspaceType="team" selectedTeamId={selectedTeamId} teams={teams} resources={resources} members={members} />;
}
