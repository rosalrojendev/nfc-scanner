import { describe, expect, it } from "vitest";
import { can } from "./permissions";
import type { Role } from "./types";

const ROLES: readonly Role[] = ["admin", "client", "inspector"] as const;

// Single source of truth for the spec. The README's permission table is the
// human-readable mirror of this; if either drifts, this test catches it.
type Expectation = Record<Role, boolean>;
const EXPECTED: Record<keyof typeof can, Expectation> = {
  viewDashboard: { admin: true, client: true, inspector: true },
  viewAnchors: { admin: true, client: true, inspector: true },
  editAnchor: { admin: true, client: true, inspector: true },
  deleteAnchor: { admin: true, client: false, inspector: true },
  viewInspections: { admin: true, client: true, inspector: true },
  logInspection: { admin: true, client: false, inspector: true },
  editInspection: { admin: true, client: false, inspector: true },
  deleteInspection: { admin: true, client: false, inspector: true },
  scan: { admin: true, client: true, inspector: true },
  writeNfc: { admin: true, client: true, inspector: true },
  viewDrawings: { admin: true, client: true, inspector: true },
  uploadDrawings: { admin: true, client: true, inspector: false },
  pinDrawing: { admin: true, client: false, inspector: true },
  downloadDrawing: { admin: true, client: true, inspector: true },
  viewReports: { admin: true, client: true, inspector: true },
  exportReports: { admin: true, client: true, inspector: false },
  emailReports: { admin: true, client: true, inspector: false },
  manageUsers: { admin: true, client: true, inspector: false },
  resetStore: { admin: true, client: false, inspector: false },
  viewSettings: { admin: true, client: true, inspector: true },
  viewTenancy: { admin: true, client: false, inspector: false },
};

describe("permissions: can.*", () => {
  // Catch any new capability that lands in `can` without a corresponding
  // row in EXPECTED — keeps the test honest as features grow.
  it("EXPECTED covers every capability defined on `can`", () => {
    const canKeys = Object.keys(can).sort();
    const expectedKeys = Object.keys(EXPECTED).sort();
    expect(expectedKeys).toEqual(canKeys);
  });

  for (const capability of Object.keys(EXPECTED) as Array<keyof typeof can>) {
    describe(capability, () => {
      for (const role of ROLES) {
        const shouldAllow = EXPECTED[capability][role];
        it(`${shouldAllow ? "allows" : "denies"} ${role}`, () => {
          expect(can[capability](role)).toBe(shouldAllow);
        });
      }
    });
  }

  describe("invariants", () => {
    it("admin can do everything", () => {
      for (const capability of Object.keys(can) as Array<keyof typeof can>) {
        expect(can[capability]("admin")).toBe(true);
      }
    });

    it("inspector cannot manage tenancy or reset store", () => {
      expect(can.viewTenancy("inspector")).toBe(false);
      expect(can.resetStore("inspector")).toBe(false);
    });

    it("client cannot mutate anchors or inspections", () => {
      expect(can.deleteAnchor("client")).toBe(false);
      expect(can.logInspection("client")).toBe(false);
      expect(can.editInspection("client")).toBe(false);
      expect(can.deleteInspection("client")).toBe(false);
    });

    it("inspector can perform field actions but cannot manage users", () => {
      expect(can.scan("inspector")).toBe(true);
      expect(can.writeNfc("inspector")).toBe(true);
      expect(can.logInspection("inspector")).toBe(true);
      expect(can.editAnchor("inspector")).toBe(true);
      expect(can.manageUsers("inspector")).toBe(false);
    });
  });
});
