import { generateToken } from "../lib/utils.js";

/**
 * Handle OAuth callback success
 */
export const oauthCallback = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }

        // Generate JWT token
        const token = generateToken(user._id, res);

        // Redirect to frontend with success
        res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};

/**
 * Handle OAuth failure
 */
export const oauthFailure = (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
};

/**
 * Link OAuth account to existing account
 */
export const linkOAuthAccount = async (req, res) => {
    try {
        const { provider } = req.params;
        const userId = req.user._id;

        // This would be called after OAuth flow when user is already logged in
        // Update user with OAuth provider info
        await User.findByIdAndUpdate(userId, {
            authProvider: provider,
            providerId: req.user.providerId
        });

        res.status(200).json({ message: `${provider} account linked successfully` });
    } catch (error) {
        console.error('Error linking OAuth account:', error);
        res.status(500).json({ error: 'Failed to link account' });
    }
};

/**
 * Unlink OAuth account
 */
export const unlinkOAuthAccount = async (req, res) => {
    try {
        const { provider } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);

        if (user.authProvider !== provider) {
            return res.status(400).json({ error: 'Account not linked with this provider' });
        }

        // Check if user has a password set (to prevent account lockout)
        if (!user.password) {
            return res.status(400).json({
                error: 'Cannot unlink OAuth account without setting a password first'
            });
        }

        // Remove OAuth linkage
        user.authProvider = 'local';
        user.providerId = null;
        await user.save();

        res.status(200).json({ message: `${provider} account unlinked successfully` });
    } catch (error) {
        console.error('Error unlinking OAuth account:', error);
        res.status(500).json({ error: 'Failed to unlink account' });
    }
};
