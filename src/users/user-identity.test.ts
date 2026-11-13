import { describe, expect, it } from "vitest";
import { getUserIndex } from "./user-identity";

const USER_COUNT = 8;
/** Always picks the middle user, so a "new random" index is recognisable. */
const RANDOM_MIDDLE = (): number => 0.5;

describe("getUserIndex", (): void => {
  it.each([
    { cookie: "0", expected: 0 },
    { cookie: "3", expected: 3 },
    { cookie: "7", expected: 7 },
  ])("keeps the stored user $cookie", ({ cookie, expected }): void => {
    expect(getUserIndex(cookie, USER_COUNT, RANDOM_MIDDLE)).toBe(expected);
  });

  it.each([
    { name: "no cookie", cookie: undefined },
    { name: "an empty cookie", cookie: "" },
    { name: "an index past the last user", cookie: "8" },
    { name: "a negative index", cookie: "-1" },
    { name: "a fraction", cookie: "2.5" },
    { name: "text", cookie: "admin" },
  ])("picks a new random user for $name", ({ cookie }): void => {
    expect(getUserIndex(cookie, USER_COUNT, RANDOM_MIDDLE)).toBe(4);
  });

  it("never picks an index outside the user list", (): void => {
    const almostOne = (): number => 0.999999;
    expect(getUserIndex(undefined, USER_COUNT, almostOne)).toBe(7);
    expect(getUserIndex(undefined, USER_COUNT, (): number => 0)).toBe(0);
  });
});
