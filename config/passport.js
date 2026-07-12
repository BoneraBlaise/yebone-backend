const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/user');

// Environment variables are validated at startup in config/validateEnv.js
const googleCredentials = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL}/api/v2/auth/google/callback`
};

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
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
        // Check if user exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but was registered with email/password
          if (user.authProvider === 'local') {
            return done(null, false, { 
              message: "Email already registered. Please login with your email and password." 
            });
          }
          return done(null, user);
        }

        // If user doesn't exist, create new user
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          authProvider: 'google',
          avatar: {
            public_id: 'google_avatar',
            url: profile.photos[0].value,
          },
          // Generate a random password for Google users
          password: require('crypto').randomBytes(16).toString('hex'),
        });

        return done(null, user);
      } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport; 