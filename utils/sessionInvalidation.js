/**
 * Increment tokenVersion to invalidate all existing JWTs for a user.
 */
function invalidateUserSessions(user) {
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  return user.tokenVersion;
}

module.exports = { invalidateUserSessions };
