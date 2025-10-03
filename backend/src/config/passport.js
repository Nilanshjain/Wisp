import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
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
                callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
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

// Apple OAuth Strategy
export const configureAppleStrategy = () => {
    // Skip if OAuth credentials not configured
    if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID) {
        console.log('⚠️  Apple OAuth not configured - skipping strategy');
        return;
    }

    passport.use(
        new AppleStrategy(
            {
                clientID: process.env.APPLE_CLIENT_ID,
                teamID: process.env.APPLE_TEAM_ID,
                keyID: process.env.APPLE_KEY_ID,
                privateKeyString: process.env.APPLE_PRIVATE_KEY,
                callbackURL: `${process.env.BACKEND_URL}/api/auth/apple/callback`,
                scope: ['email', 'name'],
            },
            async (accessToken, refreshToken, idToken, profile, done) => {
                try {
                    // Check if user already exists
                    let user = await User.findOne({
                        $or: [
                            { providerId: profile.id, authProvider: 'apple' },
                            { email: profile.email }
                        ]
                    });

                    if (user) {
                        // Update existing user
                        if (!user.providerId) {
                            user.providerId = profile.id;
                            user.authProvider = 'apple';
                            await user.save();
                        }
                        return done(null, user);
                    }

                    // Generate unique username from Apple profile
                    let username = profile.email ? profile.email.split('@')[0].toLowerCase() : `user${Date.now()}`;
                    let existingUsername = await User.findOne({ username });
                    let counter = 1;

                    while (existingUsername) {
                        username = `${profile.email ? profile.email.split('@')[0].toLowerCase() : 'user'}${counter}`;
                        existingUsername = await User.findOne({ username });
                        counter++;
                    }

                    // Create new user
                    user = await User.create({
                        email: profile.email,
                        username,
                        fullName: profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : 'Apple User',
                        authProvider: 'apple',
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
