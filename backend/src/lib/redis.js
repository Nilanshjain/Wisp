import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client with connection handling
 */
export const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        redisClient = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Redis: Too many reconnection attempts. Stopping.');
                        return new Error('Too many retries');
                    }
                    // Exponential backoff: 50ms, 100ms, 200ms, 400ms...
                    return Math.min(retries * 50, 3000);
                }
            }
        });

        // Error handler
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
            isConnected = false;
        });

        // Connection success handler
        redisClient.on('connect', () => {
            console.log('🔴 Redis connecting...');
        });

        redisClient.on('ready', () => {
            console.log('✅ Redis connected successfully');
            isConnected = true;
        });

        // Disconnection handler
        redisClient.on('end', () => {
            console.log('❌ Redis disconnected');
            isConnected = false;
        });

        // Connect to Redis
        await redisClient.connect();

        return redisClient;
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call connectRedis() first.');
    }
    return redisClient;
};

/**
 * Check if Redis is connected
 */
export const isRedisConnected = () => isConnected;

/**
 * Close Redis connection gracefully
 */
export const disconnectRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        console.log('Redis connection closed');
    }
};

/**
 * Cache user data with TTL (Time To Live)
 * @param {string} userId - User ID
 * @param {object} userData - User data to cache
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
export const cacheUser = async (userId, userData, ttl = 300) => {
    try {
        const client = getRedisClient();
        const key = `user:${userId}`;
        await client.setEx(key, ttl, JSON.stringify(userData));
    } catch (error) {
        console.error('Error caching user:', error);
    }
};

/**
 * Get cached user data
 * @param {string} userId - User ID
 * @returns {object|null} User data or null if not found
 */
export const getCachedUser = async (userId) => {
    try {
        const client = getRedisClient();
        const key = `user:${userId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting cached user:', error);
        return null;
    }
};

/**
 * Delete cached user data
 * @param {string} userId - User ID
 */
export const deleteCachedUser = async (userId) => {
    try {
        const client = getRedisClient();
        const key = `user:${userId}`;
        await client.del(key);
    } catch (error) {
        console.error('Error deleting cached user:', error);
    }
};

/**
 * Set user online status
 * @param {string} userId - User ID
 */
export const setUserOnline = async (userId) => {
    try {
        const client = getRedisClient();
        await client.sAdd('online_users', userId);
        await client.set(`user:${userId}:lastSeen`, Date.now().toString());
    } catch (error) {
        console.error('Error setting user online:', error);
    }
};

/**
 * Set user offline status
 * @param {string} userId - User ID
 */
export const setUserOffline = async (userId) => {
    try {
        const client = getRedisClient();
        await client.sRem('online_users', userId);
        await client.set(`user:${userId}:lastSeen`, Date.now().toString());
    } catch (error) {
        console.error('Error setting user offline:', error);
    }
};

/**
 * Get all online users
 * @returns {Array<string>} Array of online user IDs
 */
export const getOnlineUsers = async () => {
    try {
        const client = getRedisClient();
        return await client.sMembers('online_users');
    } catch (error) {
        console.error('Error getting online users:', error);
        return [];
    }
};

/**
 * Map socket ID to user ID
 * @param {string} socketId - Socket ID
 * @param {string} userId - User ID
 */
export const mapSocketToUser = async (socketId, userId) => {
    try {
        const client = getRedisClient();
        await client.hSet('socket_user_map', socketId, userId);
        await client.set(`user:${userId}:socketId`, socketId);
    } catch (error) {
        console.error('Error mapping socket to user:', error);
    }
};

/**
 * Get user ID by socket ID
 * @param {string} socketId - Socket ID
 * @returns {string|null} User ID or null
 */
export const getUserBySocketId = async (socketId) => {
    try {
        const client = getRedisClient();
        return await client.hGet('socket_user_map', socketId);
    } catch (error) {
        console.error('Error getting user by socket ID:', error);
        return null;
    }
};

/**
 * Get socket ID by user ID
 * @param {string} userId - User ID
 * @returns {string|null} Socket ID or null
 */
export const getSocketIdByUserId = async (userId) => {
    try {
        const client = getRedisClient();
        return await client.get(`user:${userId}:socketId`);
    } catch (error) {
        console.error('Error getting socket ID by user ID:', error);
        return null;
    }
};

/**
 * Remove socket mapping
 * @param {string} socketId - Socket ID
 */
export const removeSocketMapping = async (socketId) => {
    try {
        const client = getRedisClient();
        const userId = await client.hGet('socket_user_map', socketId);
        if (userId) {
            await client.hDel('socket_user_map', socketId);
            await client.del(`user:${userId}:socketId`);
        }
    } catch (error) {
        console.error('Error removing socket mapping:', error);
    }
};

export default {
    connectRedis,
    getRedisClient,
    isRedisConnected,
    disconnectRedis,
    cacheUser,
    getCachedUser,
    deleteCachedUser,
    setUserOnline,
    setUserOffline,
    getOnlineUsers,
    mapSocketToUser,
    getUserBySocketId,
    getSocketIdByUserId,
    removeSocketMapping
};
