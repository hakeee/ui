// Admin pages for module-host's built-in IAM. Install `accessWeb` in
// createWebHost({ modules }) and the Access nav entry and pages appear for
// whoever may see them.
import { iamContract } from "@hakeee/module-host/iam";
import type { AnyWebModule } from "@hakeee/module-host/web";
import { PoliciesPage } from "./Policies.js";
import { RolesPage } from "./Roles.js";
import { iamUi } from "./shared.js";
import { UsersPage } from "./Users.js";

export const accessWeb: AnyWebModule = iamUi.define({
  pages: { users: UsersPage, roles: RolesPage, policies: PoliciesPage },
  nav: [{ label: "Access", to: iamContract.pages.users, activeOn: [iamContract.pages.roles, iamContract.pages.policies], order: 200 }],
});

export { PoliciesPage, RolesPage, UsersPage };
export { AccessLayout, Checklist } from "./shared.js";
