import express from 'express';
import passport from 'passport';
import { oauthCallback, oauthFailure, linkOAuthAccount, unlinkOAuthAccount } from '../controllers/oauth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// Google OAuth routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/auth/oauth/failure',
        session: false
    }),
    oauthCallback
);

// OAuth failure route
router.get('/failure', oauthFailure);

// Link/Unlink OAuth accounts (requires authentication)
router.post('/link/:provider', protectRoute, linkOAuthAccount);
router.delete('/unlink/:provider', protectRoute, unlinkOAuthAccount);

export default router;
