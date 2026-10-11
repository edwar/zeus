import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, roles } from "./auth-roles";

export const authClient = createAuthClient({ plugins: [adminClient({ ac, roles })] });
