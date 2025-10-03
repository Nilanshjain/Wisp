/**
 * Role-Based Access Control Middleware
 */

// Check if user has required role
export const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized - No user found' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Forbidden - Insufficient permissions',
                requiredRole: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

// Require admin role
export const requireAdmin = checkRole('admin');

// Require moderator or admin role
export const requireModerator = checkRole('moderator', 'admin');

// Check if user is active
export const checkActive = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - No user found' });
    }

    if (!req.user.isActive) {
        return res.status(403).json({
            message: 'Account is inactive. Please contact support.'
        });
    }

    next();
};

// Check if user owns the resource or is admin
export const checkOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized - No user found' });
        }

        // Allow if user is admin or owns the resource
        if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId) {
            return next();
        }

        return res.status(403).json({
            message: 'Forbidden - You can only access your own resources'
        });
    };
};

// Permission definitions
export const PERMISSIONS = {
    // User permissions
    READ_USERS: ['user', 'moderator', 'admin'],
    UPDATE_OWN_PROFILE: ['user', 'moderator', 'admin'],
    UPDATE_ANY_PROFILE: ['admin'],
    DELETE_OWN_ACCOUNT: ['user', 'moderator', 'admin'],
    DELETE_ANY_ACCOUNT: ['admin'],

    // Message permissions
    SEND_MESSAGES: ['user', 'moderator', 'admin'],
    DELETE_OWN_MESSAGES: ['user', 'moderator', 'admin'],
    DELETE_ANY_MESSAGES: ['moderator', 'admin'],

    // Chat invite permissions
    SEND_INVITES: ['user', 'moderator', 'admin'],
    MANAGE_INVITES: ['user', 'moderator', 'admin'],

    // Admin permissions
    MANAGE_USERS: ['admin'],
    MANAGE_ROLES: ['admin'],
    VIEW_ANALYTICS: ['moderator', 'admin'],
};

// Check if user has specific permission
export const hasPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized - No user found' });
        }

        const allowedRoles = PERMISSIONS[permission];

        if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Forbidden - Insufficient permissions',
                permission,
                userRole: req.user.role
            });
        }

        next();
    };
};
