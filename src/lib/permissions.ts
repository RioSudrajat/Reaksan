import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Every resource an action can target. `defaultStatements` covers Better Auth's
// own user and session management; add a key per resource your app owns.
// Name actions for what they let someone do to *other people's* rows: owners
// already reach their own data through the session, so a role only has to grant
// the extra reach. Add a resource here first, then give roles a subset below.
export const statement = {
  ...defaultStatements,
  notes: ["read-any", "delete-any"],
  plp: ["view"],
  requests: ["read-any", "review-any", "issue-any", "return-any"],
  inventory: ["read-any", "manage-any"],
  schedule: ["read-any"],
  history: ["read-any"],
  incidents: ["read-any", "assess-any", "resolve-any"],
  labs: ["manage-any"],
  rooms: ["manage-any"],
  equipment: ["manage-any"],
  materials: ["manage-any"],
  assignments: ["manage-any"],
  configuration: ["manage-any"],
  audit: ["read-any"],
} as const;

export const ac = createAccessControl(statement);

// A role is a subset of the statement. Keep `user` deliberately empty: the
// signed-in default should be able to do nothing beyond its own records.
// `plp` is the lab operator: request review, fulfillment, inventory, incidents.
// `lecturer` and `aslab` are read-mostly scoped roles.
export const roles = {
  user: ac.newRole({
    notes: [],
    requests: [],
    incidents: [],
    inventory: [],
    schedule: [],
    history: [],
    plp: [],
  }),
  plp: ac.newRole({
    plp: ["view"],
    requests: ["read-any", "review-any", "issue-any", "return-any"],
    inventory: ["read-any", "manage-any"],
    schedule: ["read-any"],
    history: ["read-any"],
    incidents: ["read-any", "assess-any", "resolve-any"],
  }),
  lecturer: ac.newRole({
    requests: ["read-any"],
    schedule: ["read-any"],
    incidents: ["read-any"],
  }),
  aslab: ac.newRole({
    requests: ["read-any"],
    schedule: ["read-any"],
    inventory: ["read-any"],
    incidents: ["read-any", "assess-any"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    notes: ["read-any", "delete-any"],
    plp: ["view"],
    requests: ["read-any", "review-any", "issue-any", "return-any"],
    inventory: ["read-any", "manage-any"],
    schedule: ["read-any"],
    history: ["read-any"],
    incidents: ["read-any", "assess-any", "resolve-any"],
    labs: ["manage-any"],
    rooms: ["manage-any"],
    equipment: ["manage-any"],
    materials: ["manage-any"],
    assignments: ["manage-any"],
    configuration: ["manage-any"],
    audit: ["read-any"],
  }),
} as const;

export type AppRole = keyof typeof roles;

// Roles live in the `user.role` column as a string. Better Auth reads a
// comma-separated list, so "admin,plp" grants the union of both.
export const DEFAULT_ROLE = "user" satisfies AppRole;
export const ADMIN_ROLES = ["admin"] satisfies AppRole[];

// The shape accepted by permission checks, e.g. { notes: ["read-any"] }.
export type Permissions = Partial<{
  [Resource in keyof typeof statement]: (typeof statement)[Resource][number][];
}>;

// Loose map used by the runtime permission editor and stored role rows.
export type PermissionMap = Record<string, string[]>;
