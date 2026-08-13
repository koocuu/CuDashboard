import { ProjectWall } from "@/components/projects/project-wall";
import { listProjects } from "@/lib/queries/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const items = await listProjects().catch(() => []);
  return <ProjectWall initialItems={items} />;
}