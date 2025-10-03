import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/rbac.middleware.js';
import {
    getPlatformStats,
    getUserActivity,
    getMessageActivity,
    getGroupStats,
    getUserRoles,
    getAuthProviders,
    getTopUsers,
    getSystemHealth,
} from '../controllers/analytics.controller.js';

const router = express.Router();

// All analytics routes require authentication and admin role
router.use(protectRoute);
router.use(requireAdmin);

// Platform statistics
router.get('/stats', getPlatformStats);

// User analytics
router.get('/user-activity', getUserActivity);
router.get('/user-roles', getUserRoles);
router.get('/top-users', getTopUsers);

// Message analytics
router.get('/message-activity', getMessageActivity);

// Group analytics
router.get('/group-stats', getGroupStats);

// Authentication analytics
router.get('/auth-providers', getAuthProviders);

// System health
router.get('/system-health', getSystemHealth);

export default router;
