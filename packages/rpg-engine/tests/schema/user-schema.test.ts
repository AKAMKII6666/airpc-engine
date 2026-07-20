/**
 * UserSchema：gender / birthday / age 增量（细化修改 2 P1）
 */
import { describe, expect, it } from "vitest";
import { UserSchema } from "../../src/index.js";

const baseUser = {
  userId: "u1",
  nickname: "小明",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

describe("UserSchema gender/birthday/age", () => {
  it("缺新字段仍可 parse（optional）", () => {
    const ok = UserSchema.safeParse(baseUser);
    expect(ok.success).toBe(true);
  });

  it("接受 gender/birthday/age", () => {
    const ok = UserSchema.safeParse({
      ...baseUser,
      gender: "female",
      birthday: "1999-06-01",
      age: 27,
    });
    expect(ok.success).toBe(true);
    if (!ok.success) return;
    expect(ok.data.gender).toBe("female");
    expect(ok.data.birthday).toBe("1999-06-01");
    expect(ok.data.age).toBe(27);
  });

  it("非法 gender 拒收", () => {
    const bad = UserSchema.safeParse({
      ...baseUser,
      gender: "non_binary",
    });
    expect(bad.success).toBe(false);
  });

  it("非整数 age 拒收", () => {
    const bad = UserSchema.safeParse({
      ...baseUser,
      age: 18.5,
    });
    expect(bad.success).toBe(false);
  });
});
