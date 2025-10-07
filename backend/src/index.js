import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import session from "express-session";
import { connectDB } from "./lib/db.js";
import { connectRedis } from "./lib/redis.js";
import cors from "cors";
import passport from "./config/passport.js";
import { configureGoogleStrategy } from "./config/passport.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/user.routes.js";
import chatInviteRoutes from "./routes/chatInvite.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import groupRoutes from "./routes/group.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import { app, server, initializeSocketIO } from "./lib/socket.js";
import { globalLimiter } from "./middleware/rateLimiter.js";

// Load environment variables
dotenv.config();

// Configure Passport strategies
configureGoogleStrategy();

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security middleware - Helmet.js
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", FRONTEND_URL],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Session middleware (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
app.use(cors({
    origin: FRONTEND_URL = "https://frontend-production-8c40.up.railway.app",
    credentials: true,
}));

// Global rate limiting - Apply to all requests
app.use(globalLimiter);

// Routes
app.use("/api/auth", authRoutes);

// Only enable OAuth routes if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.use("/api/auth/oauth", oauthRoutes);
    console.log('✅ OAuth routes enabled');
} else {
    console.log('⚠️  OAuth routes disabled - credentials not configured');
    // Provide helpful error message when OAuth routes are accessed but disabled
    app.use("/api/auth/oauth", (req, res) => {
        res.status(503).json({
            message: "OAuth authentication is not configured",
            details: "Google OAuth credentials are not set. Please use email/password authentication or contact the administrator to enable OAuth.",
            availableAuth: ["email/password"]
        });
    });
}

app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/invites", chatInviteRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server with database and Redis connections
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Connect to Redis
        await connectRedis();

        // Initialize Socket.IO with Redis Adapter
        await initializeSocketIO();

        // Start the HTTP server
        server.listen(PORT, () => {
            console.log(`\n🚀 WispCloud Server running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Frontend URL: ${FRONTEND_URL}\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start the application
startServer();
