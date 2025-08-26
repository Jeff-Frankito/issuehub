// src/lib/project-repo.ts
import { query } from "@/lib/db";

// ---------- Types ----------
export type Visibility = "private" | "internal" | "public";
export type ProjectRole = "owner" | "admin" | "maintainer" | "contributor" | "viewer";
export type MemberStatus = "active" | "pending" | "removed";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type JoinReqStatus = "pending" | "approved" | "rejected" | "cancelled";

export type DbProject = {
  id: number;
  owner_id: number;
  name: string;
  slug: string;
  description: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
};

export type ProjectForUser = DbProject & {
  member_role: ProjectRole;
  member_status: MemberStatus;
  members_count: number;
};

export type DbProjectMember = {
  project_id: number;
  user_id: number;
  role: ProjectRole;
  status: MemberStatus;
  joined_at: string;
};

export type DbProjectInvite = {
  id: number;
  project_id: number;
  email: string;
  role: Exclude<ProjectRole, "owner">;
  token: string; // UUID
  status: InviteStatus;
  invited_by: number;
  expires_at: string;
  created_at: string;
};

export type DbJoinRequest = {
  id: number;
  project_id: number;
  user_id: number;
  message: string | null;
  status: JoinReqStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
};

// ---------- Reads ----------
export async function getProjectById(id: number) {
  const rows = await query<DbProject[]>(
    "SELECT * FROM projects WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function getProjectBySlug(slug: string) {
  const rows = await query<DbProject[]>(
    "SELECT * FROM projects WHERE slug = ? LIMIT 1",
    [slug]
  );
  return rows[0] ?? null;
}

/**
 * Lists projects the user belongs to (active membership).
 * Includes the user's role for each project.
 */
export async function listProjectsForUser(userId: number): Promise<ProjectForUser[]> {
  const rows = await query<ProjectForUser[]>(
    `
    SELECT
      p.*,
      pm.role AS member_role,
      pm.status AS member_status,
      (
        SELECT CAST(COUNT(*) AS UNSIGNED)
        FROM project_members
        WHERE project_id = p.id AND status = 'active'
      ) AS members_count
    FROM project_members pm
    JOIN projects p ON p.id = pm.project_id
    WHERE pm.user_id = ? AND pm.status = 'active'
    ORDER BY p.created_at DESC
    `,
    [userId]
  );
  return rows;
}

/**
 * Gets a single project by slug and the requesting user's membership (if any).
 */
export async function getProjectWithMembershipBySlug(slug: string, viewerUserId: number) {
  const rows = await query<
    Array<
      DbProject & {
        member_role: ProjectRole | null;
        member_status: MemberStatus | null;
      }
    >
  >(
    `
    SELECT
      p.*,
      pm.role AS member_role,
      pm.status AS member_status
    FROM projects p
    LEFT JOIN project_members pm
      ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.slug = ?
    LIMIT 1
    `,
    [viewerUserId, slug]
  );
  return rows[0] ?? null;
}

// ---------- Create / Update ----------
export async function createProject(opts: {
  ownerId: number;
  name: string;
  slug: string;
  description?: string | null;
  visibility?: Visibility;
}) {
  const {
    ownerId,
    name,
    slug,
    description = null,
    visibility = "private",
  } = opts;

  // Insert project
  const res = await query<any>(
    "INSERT INTO projects (owner_id, name, slug, description, visibility) VALUES (?,?,?,?,?)",
    [ownerId, name, slug, description, visibility]
  );
  // @ts-ignore OkPacket
  const projectId: number = res.insertId;

  // Ensure owner is also a member with 'owner' role (idempotent via PK on (project_id,user_id))
  await query(
    `
    INSERT INTO project_members (project_id, user_id, role, status)
    VALUES (?, ?, 'owner', 'active')
    ON DUPLICATE KEY UPDATE role='owner', status='active'
    `,
    [projectId, ownerId]
  );

  return getProjectById(projectId);
}

export async function updateProject(
  projectId: number,
  patch: Partial<Pick<DbProject, "name" | "slug" | "description" | "visibility">>
) {
  const fields: string[] = [];
  const params: any[] = [];

  if (patch.name !== undefined) {
    fields.push("name = ?");
    params.push(patch.name);
  }
  if (patch.slug !== undefined) {
    fields.push("slug = ?");
    params.push(patch.slug);
  }
  if (patch.description !== undefined) {
    fields.push("description = ?");
    params.push(patch.description);
  }
  if (patch.visibility !== undefined) {
    fields.push("visibility = ?");
    params.push(patch.visibility);
  }

  if (!fields.length) return getProjectById(projectId);

  params.push(projectId);
  await query(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, params);
  return getProjectById(projectId);
}

export async function deleteProject(projectId: number) {
  await query("DELETE FROM projects WHERE id = ?", [projectId]);
}

// ---------- Membership ----------
export async function getProjectMembers(projectId: number) {
  const rows = await query<
    Array<
      DbProjectMember & {
        user_email?: string;
        user_name?: string | null;
      }
    >
  >(
    `
    SELECT pm.*, u.email AS user_email, u.name AS user_name
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY
      FIELD(pm.role,'owner','admin','maintainer','contributor','viewer'),
      u.name IS NULL, u.name, u.email
    `,
    [projectId]
  );
  return rows;
}

/** Returns the user's active role in a project (or null). */
export async function getUserProjectRole(projectId: number, userId: number) {
  const rows = await query<Array<{ role: ProjectRole }>>(
    `
    SELECT role
    FROM project_members
    WHERE project_id = ? AND user_id = ? AND status = 'active'
    LIMIT 1
    `,
    [projectId, userId]
  );
  return rows[0]?.role ?? null;
}

/** Upsert a member (defaults to contributor). */
export async function upsertProjectMember(opts: {
  projectId: number;
  userId: number;
  role?: ProjectRole;
  status?: MemberStatus;
}) {
  const { projectId, userId, role = "contributor", status = "active" } = opts;
  await query(
    `
    INSERT INTO project_members (project_id, user_id, role, status)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status)
    `,
    [projectId, userId, role, status]
  );
}

/** Remove (soft) a member by marking status=removed. */
export async function removeProjectMember(projectId: number, userId: number) {
  await query(
    `UPDATE project_members SET status='removed' WHERE project_id=? AND user_id=?`,
    [projectId, userId]
  );
}

/** Simple role gates */
export function isAdminLike(role: ProjectRole | null) {
  return role === "owner" || role === "admin" || role === "maintainer";
}

// ---------- Invites ----------
export async function createProjectInvite(opts: {
  projectId: number;
  email: string;
  role?: Exclude<ProjectRole, "owner">;
  token: string; // supply UUID v4 in caller
  invitedBy: number;
  expiresAt: Date; // provide from caller (e.g., now + 72h)
}) {
  const { projectId, email, role = "contributor", token, invitedBy, expiresAt } = opts;

  const res = await query<any>(
    `
    INSERT INTO project_invites (project_id, email, role, token, status, invited_by, expires_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `,
    [projectId, email, role, token, invitedBy, expiresAt]
  );
  // @ts-ignore
  const id: number = res.insertId;
  const rows = await query<DbProjectInvite[]>(
    "SELECT * FROM project_invites WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function findInviteByToken(token: string) {
  const rows = await query<DbProjectInvite[]>(
    "SELECT * FROM project_invites WHERE token = ? LIMIT 1",
    [token]
  );
  return rows[0] ?? null;
}

/** Marks invite accepted and activates/creates membership */
export async function acceptInvite(inviteToken: string, userId: number) {
  const invite = await findInviteByToken(inviteToken);
  if (!invite) return { ok: false as const, reason: "not_found" };
  if (invite.status !== "pending") return { ok: false as const, reason: "not_pending" };

  // Check expiry
  const now = new Date();
  if (new Date(invite.expires_at).getTime() < now.getTime()) {
    await query("UPDATE project_invites SET status='expired' WHERE id = ?", [invite.id]);
    return { ok: false as const, reason: "expired" };
  }

  await query("UPDATE project_invites SET status='accepted' WHERE id = ?", [invite.id]);

  // Upsert active membership with invited role
  await upsertProjectMember({
    projectId: invite.project_id,
    userId,
    role: invite.role as ProjectRole,
    status: "active",
  });

  return { ok: true as const, projectId: invite.project_id };
}

export async function revokeInvite(id: number) {
  await query("UPDATE project_invites SET status='revoked' WHERE id = ?", [id]);
}

export async function listInvitesForProject(projectId: number) {
  const rows = await query<DbProjectInvite[]>(
    `
    SELECT * FROM project_invites
    WHERE project_id = ?
    ORDER BY created_at DESC
    `,
    [projectId]
  );
  return rows;
}

// ---------- Join Requests ----------
export async function createJoinRequest(opts: {
  projectId: number;
  userId: number;
  message?: string | null;
}) {
  const { projectId, userId, message = null } = opts;
  // Unique constraint across (project_id, user_id, status) prevents duplicates while pending
  const res = await query<any>(
    `
    INSERT INTO project_join_requests (project_id, user_id, message, status)
    VALUES (?, ?, ?, 'pending')
    `,
    [projectId, userId, message]
  );
  // @ts-ignore
  const id: number = res.insertId;
  const rows = await query<DbJoinRequest[]>(
    "SELECT * FROM project_join_requests WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function listJoinRequests(projectId: number) {
  const rows = await query<
    Array<
      DbJoinRequest & {
        requester_email?: string;
        requester_name?: string | null;
      }
    >
  >(
    `
    SELECT jr.*, u.email AS requester_email, u.name AS requester_name
    FROM project_join_requests jr
    JOIN users u ON u.id = jr.user_id
    WHERE jr.project_id = ? AND jr.status = 'pending'
    ORDER BY jr.created_at DESC
    `,
    [projectId]
  );
  return rows;
}

export async function reviewJoinRequest(opts: {
  requestId: number;
  reviewerUserId: number;
  approve: boolean;
}) {
  const { requestId, reviewerUserId, approve } = opts;

  // Load request
  const jrRows = await query<DbJoinRequest[]>(
    "SELECT * FROM project_join_requests WHERE id = ? LIMIT 1",
    [requestId]
  );
  const jr = jrRows[0];
  if (!jr) return { ok: false as const, reason: "not_found" };
  if (jr.status !== "pending") return { ok: false as const, reason: "not_pending" };

  // Update request status
  await query(
    `
    UPDATE project_join_requests
    SET status = ?, reviewed_by = ?, reviewed_at = NOW()
    WHERE id = ?
    `,
    [approve ? "approved" : "rejected", reviewerUserId, requestId]
  );

  if (approve) {
    // Add as contributor (default) active
    await upsertProjectMember({
      projectId: jr.project_id,
      userId: jr.user_id,
      role: "contributor",
      status: "active",
    });
  }

  return { ok: true as const, approved: approve, projectId: jr.project_id, userId: jr.user_id };
}

// ---------- Utilities ----------
/** Quick boolean: does user have at least admin-like role on project? */
export async function userCanManageProject(projectId: number, userId: number) {
  const role = await getUserProjectRole(projectId, userId);
  return isAdminLike(role);
}

/** Ensure slug uniqueness (case-sensitive as per DB). Returns true if free. */
export async function isSlugAvailable(slug: string) {
  const rows = await query<Array<{ c: number }>>(
    "SELECT COUNT(*) AS c FROM projects WHERE slug = ?",
    [slug]
  );
  return (rows[0]?.c ?? 0) === 0;
}
