import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../lib/redis.js';

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
        console.warn('⚠️  Redis not available for rate limiting, using memory store');

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

// Global rate limiter - 10000 requests per 15 minutes (increased for testing)
export const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: 'Too many requests from this IP, please try again later.',
});

// Auth rate limiter - Stricter for login/signup (500 requests per 15 min - increased for testing)
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
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

export default {
    globalLimiter,
    authLimiter,
    messageLimiter,
    uploadLimiter,
    apiLimiter,
};
