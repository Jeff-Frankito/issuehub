import { redirect } from "next/navigation";
import { getServerUserId } from "@/lib/server-session";
import { listProjectsForUser } from "@/lib/repos/project-repo";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const runtime = "nodejs";         // ensure Node runtime for mysql driver
export const dynamic = "force-dynamic";   // avoid static caching

export default async function ProjectsPage() {
  const userId = await getServerUserId();
  if (!userId) redirect("/login?next=/projects");

  const projects = await listProjectsForUser(userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                <TableCell className="capitalize">{p.member_role}</TableCell>
                <TableCell>{p.members_count}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption>Your memberships</TableCaption>
        </Table>
      )}
    </div>
  );
}
