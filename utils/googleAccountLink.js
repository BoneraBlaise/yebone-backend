const crypto = require("crypto");
const normalizeEmail = require("./normalizeEmail");

/**
 * Resolve a Google OAuth profile to an existing or new User document.
 * Links Google to local accounts by email — never creates duplicates.
 *
 * @param {import('passport-google-oauth20').Profile} profile
 * @param {import('mongoose').Model} User
 * @returns {Promise<{ user?: object, error?: string, message?: string }>}
 */
async function resolveGoogleUser(profile, User) {
  const email = normalizeEmail(profile.emails?.[0]?.value || "");
  if (!email) {
    return { error: "GOOGLE_EMAIL_MISSING", message: "Google account has no email." };
  }

  const googleId = profile.id;
  let user = await User.findOne({ email });

  if (user) {
    if (user.googleId && user.googleId !== googleId) {
      return {
        error: "EMAIL_LINKED_TO_OTHER_GOOGLE",
        message: "This email is linked to a different Google account.",
      };
    }

    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    return { user, isNewUser: false };
  }

  user = await User.create({
    name: profile.displayName || email.split("@")[0],
    email,
    googleId,
    authProvider: "google",
    avatar: {
      public_id: `google_${googleId}`,
      url: profile.photos?.[0]?.value || "",
    },
    password: crypto.randomBytes(16).toString("hex"),
  });

  return { user, isNewUser: true };
}

module.exports = { resolveGoogleUser };
