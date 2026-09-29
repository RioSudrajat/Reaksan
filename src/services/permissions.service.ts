import "server-only";
import { eq, inArray } from "drizzle-orm";
import { ApiError } from "@/lib/api-error";
import { db } from "@/db";
import { appRole, user } from "@/db/schema";
import {
  roles,
  statement,
  type AppRole,
  type PermissionMap,
  type Permissions,
} from "@/lib/permissions";
import { editableResources, roleDescriptions, roleLabels } from "@/lib/permission-copy";
import { writeAudit } from "@/services/audit.service";

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, { permissions: Permissions; expiresAt: number }>();

type PermissionRecord = Record<string, string[]>;

function validActionsFor(resource: string): readonly string[] | undefined {
  return (statement as Record<string, readonly string[]>)[resource];
}

// Compile-time defaults from lib/permissions.ts, cleaned to resources and
// actions the app actually knows.
export function defaultPermissionsFor(roleName: string): PermissionMap {
  const definition = (roles as Record<string, { statements?: unknown }>)[
    roleName
  ];
  const statements = (definition?.statements ?? {}) as Record<
    string,
    readonly string[]
  >;
  const cleaned: PermissionRecord = {};
  for (const [resource, actions] of Object.entries(statements)) {
    const allowed = validActionsFor(resource);
    if (!allowed) continue;
    const valid = actions.filter((action) => allowed.includes(action));
    if (valid.length > 0) cleaned[resource] = valid;
  }
  return cleaned;
}

export function invalidateRolePermissionCache(roleName?: string) {
  if (roleName) cache.delete(roleName);
  else cache.clear();
}

export async function getRolePermissions(roleName: string): Promise<Permissions> {
  // The administrator role always uses the compile-time full set so no stored
  // row or edit can lock everyone out of account management.
  if (roleName === "admin") return defaultPermissionsFor("admin");
  const cached = cache.get(roleName);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;
  const [row] = await db
    .select({ permissions: appRole.permissions })
    .from(appRole)
    .where(eq(appRole.name, roleName))
    .limit(1);
  const permissions: Permissions = row
    ? (row.permissions as Permissions)
    : roleName in roles
      ? defaultPermissionsFor(roleName)
      : {};
  cache.set(roleName, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return permissions;
}

// Comma-separated roles grant the union of their permissions.
export async function getEffectivePermissions(
  roleString: string | null | undefined,
): Promise<Permissions> {
  const names = [
    ...new Set(
      (roleString ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (names.length === 0) names.push("user");
  const merged: PermissionRecord = {};
  for (const name of names) {
    const permissions = await getRolePermissions(name);
    for (const [resource, actions] of Object.entries(permissions)) {
      const list = merged[resource] ?? [];
      for (const action of actions as string[]) {
        if (!list.includes(action)) list.push(action);
      }
      merged[resource] = list;
    }
  }
  return merged;
}

export function permissionsAllow(
  granted: Permissions,
  requested: Permissions,
): boolean {
  const available = granted as PermissionRecord;
  return Object.entries(requested).every(([resource, actions]) =>
    ((actions ?? []) as string[]).every((action) =>
      (available[resource] ?? []).includes(action),
    ),
  );
}

export async function userHasPermission(
  userId: string,
  requested: Permissions,
): Promise<boolean> {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return false;
  const granted = await getEffectivePermissions(row.role);
  return permissionsAllow(granted, requested);
}

export type RoleAccessSummary = {
  name: AppRole;
  label: string;
  description: string;
  permissions: PermissionMap;
  defaultPermissions: PermissionMap;
  customized: boolean;
  editable: boolean;
  updatedAt: string | null;
};

function samePermissions(a: PermissionMap, b: PermissionMap) {
  const normalize = (map: PermissionMap) =>
    JSON.stringify(
      Object.keys(map)
        .sort()
        .map((resource) => [
          resource,
          [...new Set(map[resource] ?? [])].sort(),
        ]),
    );
  return normalize(a) === normalize(b);
}

export async function listRoleAccess(): Promise<RoleAccessSummary[]> {
  const names = Object.keys(roles) as AppRole[];
  const rows = names.length
    ? await db
        .select({
          name: appRole.name,
          permissions: appRole.permissions,
          updatedAt: appRole.updatedAt,
        })
        .from(appRole)
        .where(inArray(appRole.name, names))
    : [];
  const byName = new Map(rows.map((row) => [row.name, row]));
  return names.map((name) => {
    const row = byName.get(name);
    const defaults = defaultPermissionsFor(name);
    const permissions =
      name === "admin"
        ? defaults
        : row
          ? (row.permissions as PermissionMap)
          : defaults;
    return {
      name,
      label: roleLabels[name] ?? name,
      description: roleDescriptions[name] ?? "",
      permissions,
      defaultPermissions: defaults,
      customized:
        name !== "admin" && row !== undefined && !samePermissions(permissions, defaults),
      editable: name !== "admin",
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });
}

export async function updateRolePermissions(
  actorId: string,
  roleName: string,
  permissions: PermissionMap,
) {
  if (!(roleName in roles))
    throw new ApiError(404, "NOT_FOUND", "Peran tidak ditemukan.");
  if (roleName === "admin")
    throw new ApiError(
      403,
      "ADMIN_ROLE_LOCKED",
      "Peran administrator selalu penuh dan tidak bisa dikurangi.",
    );
  const cleaned: PermissionRecord = {};
  for (const [resource, actions] of Object.entries(permissions)) {
    const allowed = validActionsFor(resource);
    if (!allowed)
      throw new ApiError(
        422,
        "UNKNOWN_RESOURCE",
        `Resource "${resource}" tidak dikenal.`,
      );
    if (!(editableResources as readonly string[]).includes(resource))
      throw new ApiError(
        422,
        "RESERVED_RESOURCE",
        `Resource "${resource}" dikelola Better Auth dan tidak bisa diubah dari sini.`,
      );
    const list = [...new Set(actions as string[])];
    for (const action of list)
      if (!allowed.includes(action))
        throw new ApiError(
          422,
          "UNKNOWN_ACTION",
          `Action "${action}" tidak dikenal untuk resource "${resource}".`,
        );
    if (list.length > 0) cleaned[resource] = list;
  }

  const before = await getRolePermissions(roleName);
  const [updated] = await db
    .insert(appRole)
    .values({ name: roleName, permissions: cleaned })
    .onConflictDoUpdate({
      target: appRole.name,
      set: { permissions: cleaned },
    })
    .returning();
  invalidateRolePermissionCache(roleName);
  await writeAudit(db, {
    actorId,
    action: "UPDATE",
    entityType: "app_role",
    entityId: roleName,
    before: before as Record<string, unknown>,
    after: cleaned as Record<string, unknown>,
  });
  return updated;
}

export { editableResources };
