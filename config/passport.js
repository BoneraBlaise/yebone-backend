const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/user');
const { resolveGoogleUser } = require('../utils/googleAccountLink');

const googleCredentials = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/v2/auth/google/callback`
};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    googleCredentials,
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await resolveGoogleUser(profile, User);

        if (result.error) {
          return done(null, false, { message: result.message });
        }

        return done(null, result.user);
      } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
