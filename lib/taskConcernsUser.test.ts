import { describe, expect, it } from "vitest";
import { resolveDefaultSubtaskAssignee, teamAdminNameForUser } from "./taskConcernsUser";

const TEAM = ["Jean-Baptiste Coroyer", "Marie Martin", "Paul Durand"];

describe("teamAdminNameForUser", () => {
  it("associe le nom complet ou le prénom+nom du profil à la liste équipe", () => {
    expect(
      teamAdminNameForUser(TEAM, {
        teamMemberName: "Marie Martin",
        displayName: null,
        email: "marie@example.com",
      }),
    ).toBe("Marie Martin");

    expect(
      teamAdminNameForUser(TEAM, {
        teamMemberName: "Jean-Baptiste",
        displayName: null,
        email: "jb@example.com",
      }),
    ).toBe("Jean-Baptiste Coroyer");
  });
});

describe("resolveDefaultSubtaskAssignee", () => {
  it("priorise l'utilisateur connecté plutôt que le premier de la liste", () => {
    expect(
      resolveDefaultSubtaskAssignee(TEAM, {
        currentUser: { teamMemberName: "Marie Martin", displayName: null, email: "" },
        parentTaskAdmins: ["Jean-Baptiste Coroyer"],
      }),
    ).toBe("Marie Martin");
  });
});
