"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { ac, roles } from "@/lib/permissions";

// Relative URLs keep authentication on the same origin as the app.
// adminClient shares the access control, so authClient.admin.checkRolePermission
// can hide UI locally. It is a convenience only: every server boundary still
// checks permissions itself.
export const authClient = createAuthClient({
  plugins: [usernameClient({ displayUsername: false }), adminClient({ ac, roles })],
});
