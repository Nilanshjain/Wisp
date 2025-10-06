import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';

// Google OAuth Strategy
export const configureGoogleStrategy = () => {
    // Skip if OAuth credentials not configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('⚠️  Google OAuth not configured - skipping strategy');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL}/api/auth/oauth/google/callback`,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user already exists
                    let user = await User.findOne({
                        $or: [
                            { providerId: profile.id, authProvider: 'google' },
                            { email: profile.emails[0].value }
                        ]
                    });

                    if (user) {
                        // Update existing user
                        if (!user.providerId) {
                            user.providerId = profile.id;
                            user.authProvider = 'google';
                            await user.save();
                        }
                        return done(null, user);
                    }

                    // Generate unique username from Google profile
                    let username = profile.emails[0].value.split('@')[0].toLowerCase();
                    let existingUsername = await User.findOne({ username });
                    let counter = 1;

                    while (existingUsername) {
                        username = `${profile.emails[0].value.split('@')[0].toLowerCase()}${counter}`;
                        existingUsername = await User.findOne({ username });
                        counter++;
                    }

                    // Create new user
                    user = await User.create({
                        email: profile.emails[0].value,
                        username,
                        fullName: profile.displayName,
                        profilePic: profile.photos[0]?.value || '',
                        authProvider: 'google',
                        providerId: profile.id,
                    });

                    done(null, user);
                } catch (error) {
                    done(error, null);
                }
            }
        )
    );
};

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password');
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
