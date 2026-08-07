const { describe, it, beforeEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const {
  generateOtp,
  hashOtp,
  verifyOtp,
  isOtpExpired,
  verifyOtpForUser,
  clearOtpFields,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
} = require("../passwordResetOtp");

describe("passwordResetOtp", () => {
  it("generates 6-digit OTP", () => {
    const otp = generateOtp();
    assert.match(otp, /^\d{6}$/);
  });

  it("hashes and verifies OTP without storing plaintext", async () => {
    const otp = "482910";
    const hash = await hashOtp(otp);
    assert.notEqual(hash, otp);
    assert.equal(await verifyOtp(otp, hash), true);
    assert.equal(await verifyOtp("000000", hash), false);
  });

  it("detects expired OTP", () => {
    const past = new Date(Date.now() - 1000);
    assert.equal(isOtpExpired(past), true);
    const future = new Date(Date.now() + OTP_TTL_MS);
    assert.equal(isOtpExpired(future), false);
  });

  describe("verifyOtpForUser", () => {
    let user;

    beforeEach(() => {
      user = {
        passwordResetOtpHash: undefined,
        passwordResetOtpExpires: undefined,
        passwordResetOtpAttempts: 0,
        save: mock.fn(async () => user),
      };
    });

    it("rejects invalid OTP and increments attempts", async () => {
      user.passwordResetOtpHash = await hashOtp("123456");
      user.passwordResetOtpExpires = new Date(Date.now() + OTP_TTL_MS);

      const result = await verifyOtpForUser(user, "000000");
      assert.equal(result.ok, false);
      assert.equal(result.code, "INVALID_OTP");
      assert.equal(user.passwordResetOtpAttempts, 1);
    });

    it("invalidates OTP after max attempts", async () => {
      user.passwordResetOtpHash = await hashOtp("123456");
      user.passwordResetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      user.passwordResetOtpAttempts = MAX_OTP_ATTEMPTS - 1;

      const result = await verifyOtpForUser(user, "000000");
      assert.equal(result.ok, false);
      assert.equal(result.code, "TOO_MANY_ATTEMPTS");
      assert.equal(user.passwordResetOtpHash, undefined);
    });

    it("accepts valid OTP", async () => {
      user.passwordResetOtpHash = await hashOtp("123456");
      user.passwordResetOtpExpires = new Date(Date.now() + OTP_TTL_MS);

      const result = await verifyOtpForUser(user, "123456");
      assert.equal(result.ok, true);
    });

    it("rejects expired OTP", async () => {
      user.passwordResetOtpHash = await hashOtp("123456");
      user.passwordResetOtpExpires = new Date(Date.now() - 1000);

      const result = await verifyOtpForUser(user, "123456");
      assert.equal(result.ok, false);
      assert.equal(result.code, "EXPIRED");
    });
  });
});
