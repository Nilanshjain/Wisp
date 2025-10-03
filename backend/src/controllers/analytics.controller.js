import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import GroupMember from '../models/groupMember.model.js';

/**
 * Get overall platform statistics
 * GET /api/analytics/stats
 */
export const getPlatformStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalMessages,
            totalGroups,
            activeUsers,
            oauthUsers,
        ] = await Promise.all([
            User.countDocuments(),
            Message.countDocuments(),
            Group.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ authProvider: { $ne: 'local' } }),
        ]);

        // Calculate messages sent today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesToday = await Message.countDocuments({
            createdAt: { $gte: today },
        });

        // Calculate new users this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newUsersThisWeek = await User.countDocuments({
            createdAt: { $gte: weekAgo },
        });

        res.status(200).json({
            totalUsers,
            activeUsers,
            totalMessages,
            messagesToday,
            totalGroups,
            oauthUsers,
            newUsersThisWeek,
        });
    } catch (error) {
        console.error('Error in getPlatformStats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get user activity over time
 * GET /api/analytics/user-activity?days=30
 */
export const getUserActivity = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const userActivity = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        res.status(200).json(userActivity);
    } catch (error) {
        console.error('Error in getUserActivity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get message activity over time
 * GET /api/analytics/message-activity?days=30
 */
export const getMessageActivity = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const messageActivity = await Message.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                        },
                        isGroupMessage: '$isGroupMessage',
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.date': 1 },
            },
        ]);

        res.status(200).json(messageActivity);
    } catch (error) {
        console.error('Error in getMessageActivity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get group statistics
 * GET /api/analytics/group-stats
 */
export const getGroupStats = async (req, res) => {
    try {
        const [
            totalGroups,
            activeGroups,
            avgGroupSize,
            topGroups,
        ] = await Promise.all([
            Group.countDocuments(),
            Group.countDocuments({ isActive: true }),
            GroupMember.aggregate([
                {
                    $match: { status: 'active' },
                },
                {
                    $group: {
                        _id: '$groupId',
                        memberCount: { $sum: 1 },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgSize: { $avg: '$memberCount' },
                    },
                },
            ]),
            Group.find()
                .sort({ 'stats.totalMessages': -1 })
                .limit(10)
                .populate('createdBy', 'username')
                .select('name stats createdBy'),
        ]);

        res.status(200).json({
            totalGroups,
            activeGroups,
            avgGroupSize: avgGroupSize[0]?.avgSize || 0,
            topGroups,
        });
    } catch (error) {
        console.error('Error in getGroupStats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get user role distribution
 * GET /api/analytics/user-roles
 */
export const getUserRoles = async (req, res) => {
    try {
        const roleDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json(roleDistribution);
    } catch (error) {
        console.error('Error in getUserRoles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get authentication provider distribution
 * GET /api/analytics/auth-providers
 */
export const getAuthProviders = async (req, res) => {
    try {
        const authProviders = await User.aggregate([
            {
                $group: {
                    _id: '$authProvider',
                    count: { $sum: 1 },
                },
            },
        ]);

        res.status(200).json(authProviders);
    } catch (error) {
        console.error('Error in getAuthProviders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get top active users
 * GET /api/analytics/top-users?limit=10
 */
export const getTopUsers = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const topUsers = await Message.aggregate([
            {
                $group: {
                    _id: '$senderId',
                    messageCount: { $sum: 1 },
                },
            },
            {
                $sort: { messageCount: -1 },
            },
            {
                $limit: parseInt(limit),
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: '$user',
            },
            {
                $project: {
                    _id: 1,
                    messageCount: 1,
                    username: '$user.username',
                    fullName: '$user.fullName',
                    profilePic: '$user.profilePic',
                },
            },
        ]);

        res.status(200).json(topUsers);
    } catch (error) {
        console.error('Error in getTopUsers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get system health metrics
 * GET /api/analytics/system-health
 */
export const getSystemHealth = async (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        // Get database stats (optional, requires proper permissions)
        let dbStats = {};
        try {
            dbStats = await User.db.db.stats();
        } catch (error) {
            console.log('Could not fetch DB stats:', error.message);
        }

        res.status(200).json({
            uptime: Math.floor(uptime),
            memory: {
                rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
            },
            database: {
                dataSize: dbStats.dataSize ? Math.floor(dbStats.dataSize / 1024 / 1024) : 0, // MB
                storageSize: dbStats.storageSize ? Math.floor(dbStats.storageSize / 1024 / 1024) : 0, // MB
            },
            nodeVersion: process.version,
            platform: process.platform,
        });
    } catch (error) {
        console.error('Error in getSystemHealth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
