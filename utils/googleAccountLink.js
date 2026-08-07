const crypto = require("crypto");
const normalizeEmail = require("./normalizeEmail");

const DEFAULT_AVATAR_PATH = "/logo512.png";

function getDefaultAvatarUrl() {
  const base = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
  return base ? `${base}${DEFAULT_AVATAR_PATH}` : DEFAULT_AVATAR_PATH;
}

/**
 * Resolve a Google OAuth profile to an existing or new User document.
 * Links Google to local accounts by email — never creates duplicates.
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

  const displayName =
    profile.displayName?.trim() || email.split("@")[0] || "YEBONE User";
  const photoUrl = profile.photos?.[0]?.value || getDefaultAvatarUrl();

  try {
    user = await User.create({
      name: displayName,
      email,
      googleId,
      authProvider: "google",
      avatar: {
        public_id: `google_${googleId}`,
        url: photoUrl,
      },
      password: crypto.randomBytes(16).toString("hex"),
    });
  } catch (error) {
    if (error?.code === 11000) {
      user = await User.findOne({ email });
      if (user) {
        return { user, isNewUser: false };
      }
    }
    throw error;
  }

  return { user, isNewUser: true };
}

module.exports = { resolveGoogleUser, getDefaultAvatarUrl };
