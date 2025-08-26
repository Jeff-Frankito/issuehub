import { query } from '@/lib/db';

export type DbUser = {
  id: number; email: string; name: string|null; password_hash: string; token_version: number;
};

export async function getUserByEmail(email: string) {
  const rows = await query<DbUser[]>('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] ?? null;
};

export async function getUserById(id: number) {
  const rows = await query<DbUser[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
};

export async function getUserRoles(userId: number) {
  const rows = await query<{ slug: string }[]>(
    `SELECT r.slug FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`, [userId]
  );
  return rows.map(r => r.slug);
};

export async function createUser(
  opts: { email: string; name?: string|null; passwordHash: string; roles?: string[] }
) {
  const { email, name = null, passwordHash, roles = ['USER'] } = opts;
  const res = await query<any>('INSERT INTO users (email, name, password_hash) VALUES (?,?,?)',
    [email, name, passwordHash]);
  // @ts-ignore OkPacket
  const userId = res.insertId as number;

  if (roles.length) {
    const roleRows = await query<{ id: number }[]>(
      `SELECT id FROM roles WHERE slug IN (${roles.map(() => '?').join(',')})`, roles
    );
    if (roleRows.length) {
      const values = roleRows.map(r => `(${userId}, ${r.id})`).join(',');
      await query(`INSERT IGNORE INTO user_roles (user_id, role_id) VALUES ${values}`);
    }
  }
  return getUserById(userId);
};

export type UserWithRoles = {
  id: number;
  email: string;
  name: string | null;
  token_version: number;
  roles: string[];
  // Include password_hash only on the email lookup (for login check)
  password_hash?: string;
};

export async function getUserWithRolesByEmail(
  email: string
): Promise<UserWithRoles | null> {
  const rows = await query<any[]>(
    `
    SELECT
      u.id,
      u.email,
      u.name,
      u.password_hash,
      u.token_version,
      GROUP_CONCAT(DISTINCT r.slug) AS roles_csv
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.email = ?
    GROUP BY u.id, u.email, u.name, u.password_hash, u.token_version
    LIMIT 1
    `,
    [email]
  );
  if (!rows.length) return null;

  const r = rows[0];
  const roles =
    r.roles_csv && typeof r.roles_csv === "string"
      ? r.roles_csv.split(",").filter(Boolean)
      : [];

  const out: UserWithRoles = {
    id: r.id,
    email: r.email,
    name: r.name,
    token_version: r.token_version ?? 0,
    roles,
    password_hash: r.password_hash,
  };
  return out;
}

export async function getUserWithRolesById(
  userId: number
): Promise<UserWithRoles | null> {
  const rows = await query<any[]>(
    `
    SELECT
      u.id,
      u.email,
      u.name,
      u.token_version,
      GROUP_CONCAT(DISTINCT r.slug) AS roles_csv
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = ?
    GROUP BY u.id, u.email, u.name, u.token_version
    LIMIT 1
    `,
    [userId]
  );
  if (!rows.length) return null;

  const r = rows[0];
  const roles =
    r.roles_csv && typeof r.roles_csv === "string"
      ? r.roles_csv.split(",").filter(Boolean)
      : [];

  const out: UserWithRoles = {
    id: r.id,
    email: r.email,
    name: r.name,
    token_version: r.token_version ?? 0,
    roles,
  };
  return out;
}
