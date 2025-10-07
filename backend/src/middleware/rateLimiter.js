import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisConnected } from '../lib/redis.js';

/**
 * Create rate limiter with Redis store
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limit middleware
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        max = 100, // Max requests per window
        message = 'Too many requests, please try again later.',
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
    } = options;

    // Check if Redis is connected before trying to use it
    if (!isRedisConnected()) {
        console.warn('⚠️  Redis not connected for rate limiting, using memory store');

        // Fallback to memory store if Redis is unavailable
        return rateLimit({
            windowMs,
            max,
            message: { error: message },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests,
            skipFailedRequests,
        });
    }

    try {
        const redisClient = getRedisClient();

        return rateLimit({
            windowMs,
            max,
            message: { error: message },
            standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
            legacyHeaders: false, // Disable `X-RateLimit-*` headers
            skipSuccessfulRequests,
            skipFailedRequests,
            store: new RedisStore({
                // @ts-expect-error - RedisStore expects different client type
                sendCommand: (...args) => redisClient.sendCommand(args),
            }),
            // Custom key generator - use IP + user ID if authenticated
            keyGenerator: (req) => {
                if (req.user && req.user._id) {
                    return `${req.ip}-${req.user._id}`;
                }
                return req.ip;
            },
        });
    } catch (error) {
        console.warn('⚠️  Redis error for rate limiting, using memory store:', error.message);

        // Fallback to memory store if Redis is unavailable
        return rateLimit({
            windowMs,
            max,
            message: { error: message },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests,
            skipFailedRequests,
        });
    }
};

// Global rate limiter - More lenient in development and production
export const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 1000 : 500, // 1000 for dev, 500 for prod (increased from 100)
    message: 'Too many requests from this IP, please try again later.',
});

// Auth rate limiter - Stricter for login/signup
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 100 : 20,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful logins
});

// Message rate limiter - 50 messages per minute
export const messageLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many messages sent, please slow down.',
});

// Upload rate limiter - 10 uploads per hour
export const uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many uploads, please try again later.',
});

// API rate limiter - 200 requests per minute
export const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 200,
    message: 'API rate limit exceeded, please try again later.',
});

// User data rate limiter - More lenient for fetching user lists
export const userDataLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests for user data, please try again later.',
});

export default {
    globalLimiter,
    authLimiter,
    messageLimiter,
    uploadLimiter,
    apiLimiter,
    userDataLimiter,
};
