import { describe, expect, it } from "vitest";
import { inviteTokenFrom } from "./inviteLink.js";

describe("inviteTokenFrom", () => {
  it("finds the token at the end of the path, under any base path", () => {
    const token = "Qx3_-abcdefghijklmnopqrstuvwxyz0123456789ABCD";
    expect(inviteTokenFrom(`/invite/${token}`)).toBe(token);
    expect(inviteTokenFrom(`/app/invite/${token}/`)).toBe(token);
    expect(inviteTokenFrom("/invite/short")).toBeNull();
    expect(inviteTokenFrom(`/invite/${token}/more`)).toBeNull();
    expect(inviteTokenFrom("/clients")).toBeNull();
  });
});
