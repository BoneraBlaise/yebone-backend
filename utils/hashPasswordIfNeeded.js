const bcrypt = require("bcryptjs");

/** bcrypt hashes are 60 chars and start with $2a$, $2b$, or $2y$ */
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

function isBcryptHash(value) {
  return typeof value === "string" && BCRYPT_HASH_PATTERN.test(value);
}

/**
 * Hash a plaintext password once. If the value is already a bcrypt hash,
 * return it unchanged — prevents accidental double-hashing on document saves.
 */
async function hashPasswordIfNeeded(password) {
  if (!password) {
    throw new Error("Password is required for hashing");
  }
  if (isBcryptHash(password)) {
    return password;
  }
  return bcrypt.hash(password, 10);
}

module.exports = {
  hashPasswordIfNeeded,
  isBcryptHash,
  BCRYPT_HASH_PATTERN,
};
