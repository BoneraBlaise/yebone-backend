const crypto = require("crypto");
const normalizeEmail = require("./normalizeEmail");
const { getLogoUrl } = require("./email/emailBrand");

function getGoogleProfilePhotoUrl(profile) {
  return (
    profile.photos?.[0]?.value ||
    profile._json?.picture ||
    profile.picture ||
    null
  );
}

function getDefaultAvatarUrl() {
  return getLogoUrl();
}

function shouldRefreshAvatar(user) {
  const url = String(user?.avatar?.url || "").trim();
  if (!url) return true;
  if (url.endsWith("/logo512.png")) return true;
  return false;
}

function buildGoogleAvatar(googleId, photoUrl) {
  return {
    public_id: `google_${googleId}`,
    url: photoUrl || getDefaultAvatarUrl(),
  };
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
  const photoUrl = getGoogleProfilePhotoUrl(profile);
  let user = await User.findOne({ email });

  if (user) {
    if (user.googleId && user.googleId !== googleId) {
      return {
        error: "EMAIL_LINKED_TO_OTHER_GOOGLE",
        message: "This email is linked to a different Google account.",
      };
    }

    let linked = false;
    if (!user.googleId) {
      user.googleId = googleId;
      linked = true;
    }

    if (photoUrl && shouldRefreshAvatar(user)) {
      user.avatar = buildGoogleAvatar(googleId, photoUrl);
      linked = true;
    }

    if (linked) {
      await user.save();
    }

    return { user, isNewUser: false };
  }

  const displayName =
    profile.displayName?.trim() || email.split("@")[0] || "YEBONE User";

  try {
    user = await User.create({
      name: displayName,
      email,
      googleId,
      authProvider: "google",
      avatar: buildGoogleAvatar(googleId, photoUrl),
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

module.exports = {
  resolveGoogleUser,
  getDefaultAvatarUrl,
  getGoogleProfilePhotoUrl,
  shouldRefreshAvatar,
};
