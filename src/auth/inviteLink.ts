/** `/…/invite/<token>` → the token. Invite links are built by the app as `<web origin>/invite/<token>`. */
export function inviteTokenFrom(pathname: string): string | null {
  return /\/invite\/([A-Za-z0-9_-]{16,})\/?$/.exec(pathname)?.[1] ?? null;
}
