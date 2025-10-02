# WispCloud Implementation Guide

**Last Updated:** Phase 2 Complete
**Version:** 1.0.0

This guide provides detailed explanations of how every feature in WispCloud is implemented. It will be updated as we progress through Phase 3 and Phase 4.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Setup & Management](#database-setup--management)
3. [Security Implementation](#security-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Real-time Features](#real-time-features)
7. [API Reference](#api-reference)
8. [Phase 3 Roadmap](#phase-3-roadmap)

---

## Architecture Overview

### Technology Stack

**Backend:**
- **Node.js 20+** with ES Modules
- **Express.js** - Web framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **Redis** - Caching and session management
- **Socket.IO** - Real-time WebSocket communication
- **JWT** - Authentication tokens

**Frontend:**
- **React 19** - UI framework
- **Vite** - Build tool
- **Zustand** - State management
- **TailwindCSS** - Styling
- **Axios** - HTTP client

**Infrastructure:**
- **Docker** - Containerization
- **Docker Compose** - Local orchestration

### Project Structure

```
WispCloud/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── models/           # Database schemas
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Custom middleware
│   │   ├── lib/              # Utilities (DB, Redis, Socket.IO)
│   │   └── index.js          # Entry point
│   ├── Dockerfile            # Backend container
│   └── package.json
├── frontend/
│   └── Wisp/
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── pages/        # Page components
│       │   ├── store/        # Zustand stores
│       │   └── lib/          # Axios config
│       ├── Dockerfile        # Frontend container
│       └── package.json
└── docker-compose.yml        # Orchestration
```

---

## Database Setup & Management

### MongoDB Configuration

**Connection Setup** (`backend/src/lib/db.js`):

```javascript
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected:", conn.connection.host);
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};
```

**Key Concepts:**
- Uses Mongoose ODM for schema validation and query building
- Connection string includes authentication (`authSource=admin`)
- Auto-reconnection handled by Mongoose

### Database Schemas

#### User Model (`backend/src/models/user.model.js`)

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false, // Never return password in queries
  },
  profilePic: {
    type: String,
    default: "",
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for faster email lookups
userSchema.index({ email: 1 });
```

**Field Explanations:**
- `email`: Unique identifier, indexed for fast lookups
- `password`: Hashed with bcrypt, excluded from queries by default (`select: false`)
- `profilePic`: Cloudinary URL or empty string
- `lastSeen`: Tracks user activity
- `timestamps`: Auto-adds `createdAt` and `updatedAt`

#### Message Model (`backend/src/models/message.model.js`)

```javascript
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
  },
  image: {
    type: String,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  readAt: {
    type: Date,
  },
}, { timestamps: true });

// Compound indexes for efficient queries
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1 });
```

**Index Strategy:**
1. **Compound Index** `(senderId, receiverId, createdAt)`:
   - Used for fetching conversation history
   - Sorted by creation date (descending)

2. **Compound Index** `(receiverId, status)`:
   - Used for finding unread messages
   - Efficient for status updates

### Accessing the Database

**Using MongoDB Shell (Docker):**

```bash
# Connect to MongoDB container
docker exec -it wispcloud-mongodb mongosh mongodb://admin:password123@localhost:27017/wispcloud?authSource=admin

# List all users
db.users.find().pretty()

# Find user by email
db.users.findOne({ email: "user@example.com" })

# Count messages
db.messages.countDocuments()

# Find messages between two users
db.messages.find({
  $or: [
    { senderId: ObjectId("USER_ID_1"), receiverId: ObjectId("USER_ID_2") },
    { senderId: ObjectId("USER_ID_2"), receiverId: ObjectId("USER_ID_1") }
  ]
}).sort({ createdAt: -1 })

# Get unread message count for a user
db.messages.countDocuments({
  receiverId: ObjectId("USER_ID"),
  status: { $ne: "read" }
})
```

**Using Node.js (in controllers):**

```javascript
// Find all users
const users = await User.find({ _id: { $ne: req.user._id } });

// Find user with password (override select: false)
const user = await User.findOne({ email }).select("+password");

// Create new user
const newUser = await User.create({
  email,
  fullName,
  password: hashedPassword,
});

// Update user
await User.findByIdAndUpdate(userId, { profilePic: cloudinaryUrl });
```

### User Management

**Creating a User:**
1. Password is hashed with bcrypt (10 salt rounds)
2. JWT token generated and stored in HTTP-only cookie
3. User document saved to MongoDB
4. Password excluded from response

**Updating a User:**
1. Profile picture uploaded to Cloudinary
2. URL stored in user document
3. Updated user returned (password still excluded)

**Deleting a User** (not implemented yet):
- Would cascade delete all messages
- Remove from Redis cache
- Invalidate JWT token

---

## Security Implementation

### 1. Rate Limiting (`backend/src/middleware/rateLimiter.js`)

**How It Works:**
- Uses `express-rate-limit` package
- Stores rate limit data in Redis for distributed systems
- Falls back to memory store if Redis unavailable

**Implementation:**

```javascript
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../lib/redis.js';

const createRateLimiter = (options = {}) => {
  const redisClient = getRedisClient();

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Time window
    max: options.max || 100,                      // Max requests
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    keyGenerator: (req) => {
      // Use IP + UserID for authenticated requests
      if (req.user?._id) {
        return `${req.ip}-${req.user._id}`;
      }
      return req.ip;
    },
  });
};
```

**Rate Limiters Configured:**

| Limiter | Window | Max Requests | Applied To |
|---------|--------|--------------|------------|
| Global | 15 min | 100 | All routes |
| Auth | 15 min | 5 | `/api/auth/*` |
| Messages | 1 min | 50 | `/api/messages/send/*` |
| Upload | 1 hour | 10 | `/api/auth/update-profile` |

**Why Redis for Rate Limiting?**
- Shared state across multiple server instances
- Atomic increment operations
- TTL (Time To Live) support for auto-expiry
- High performance (in-memory)

**Fallback Mechanism:**
If Redis is down, rate limiting uses in-memory store:
- Only works for single server instance
- Data lost on server restart
- Still better than no rate limiting

### 2. Input Validation (`backend/src/middleware/validation.js`)

**How It Works:**
- Uses Zod library for schema-based validation
- Validates request body, query params, or URL params
- Returns detailed error messages

**Implementation:**

```javascript
import { z } from 'zod';

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req[source]);
      req[source] = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};
```

**Validation Schemas:**

**Signup Schema:**
```javascript
export const signupSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email too long'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(50, 'Full name too long')
    .trim(),
});
```

**Message Schema:**
```javascript
export const sendMessageSchema = z.object({
  text: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long')
    .trim()
    .optional(),
  image: z.string()
    .url('Invalid image URL')
    .optional(),
}).refine(
  data => data.text || data.image,
  { message: 'Either text or image must be provided' }
);
```

**Benefits:**
- Type safety (transforms strings to numbers where needed)
- Detailed error messages for users
- Prevents malicious input
- Self-documenting code

### 3. Security Headers (`backend/src/index.js`)

**Using Helmet.js:**

```javascript
import helmet from 'helmet';

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
```

**Security Headers Added:**

1. **Content-Security-Policy (CSP)**:
   - Prevents XSS attacks
   - Only allows resources from trusted sources
   - Blocks inline scripts (except whitelisted)

2. **X-Content-Type-Options**: `nosniff`
   - Prevents MIME-type sniffing

3. **X-Frame-Options**: `DENY`
   - Prevents clickjacking attacks

4. **Strict-Transport-Security (HSTS)**:
   - Forces HTTPS connections

5. **X-XSS-Protection**: `1; mode=block`
   - Enables browser XSS filtering

**CORS Configuration:**

```javascript
app.use(cors({
  origin: FRONTEND_URL,  // Only allow frontend domain
  credentials: true,     // Allow cookies
}));
```

### 4. Authentication & Password Security

**Password Hashing:**

```javascript
import bcrypt from "bcryptjs";

// During signup
const salt = await bcrypt.genSalt(10);
const hashPassword = await bcrypt.hash(password, salt);

// During login
const isPasswordCorrect = await bcrypt.compare(password, user.password);
```

**JWT Token Generation:**

```javascript
import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,      // Prevents XSS attacks
    sameSite: "strict",  // Prevents CSRF attacks
    secure: process.env.NODE_ENV !== "development", // HTTPS only in production
  });

  return token;
};
```

**Authentication Middleware:**

```javascript
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};
```

---

## Backend Implementation

### Routes & Controllers

#### Auth Routes (`backend/src/routes/auth.route.js`)

```javascript
import express from "express";
import { signup, login, logout, updateProfile, checkAuth } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { validate, signupSchema, loginSchema } from "../middleware/validation.js";
import { authLimiter, uploadLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public routes with rate limiting
router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);

// Protected routes
router.put("/update-profile", protectRoute, uploadLimiter, updateProfile);
router.get("/check", protectRoute, checkAuth);

export default router;
```

**Route Flow Example (Signup):**
1. Request hits `/api/auth/signup`
2. `authLimiter` middleware checks rate limit (5 per 15 min)
3. `validate(signupSchema)` validates request body
4. `signup` controller executes if validation passes

#### Auth Controller (`backend/src/controllers/auth.controller.js`)

**Signup Function:**

```javascript
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    // 1. Check if user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // 3. Create new user
    const newUser = new User({
      fullName,
      email,
      password: hashPassword,
    });

    // 4. Generate JWT token
    generateToken(newUser._id, res);

    // 5. Save user to database
    await newUser.save();

    // 6. Return user data (password excluded)
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**Login Function:**

```javascript
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user with password (override select: false)
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2. Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3. Generate JWT token
    generateToken(user._id, res);

    // 4. Return user data
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

#### Message Routes (`backend/src/routes/messageRoutes.js`)

```javascript
import express from "express";
import { getUsersForSidebar, getMessages, sendMessage } from "../controllers/message.controllers.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { messageLimiter } from "../middleware/rateLimiter.js";
import { validate, sendMessageSchema, userIdParamSchema, paginationSchema } from "../middleware/validation.js";

const router = express.Router();

// All routes are protected
router.get("/users", protectRoute, getUsersForSidebar);

router.get(
  "/:id",
  protectRoute,
  validate(userIdParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  getMessages
);

router.post(
  "/send/:id",
  protectRoute,
  messageLimiter,
  validate(userIdParamSchema, 'params'),
  validate(sendMessageSchema),
  sendMessage
);

export default router;
```

#### Message Controller (`backend/src/controllers/message.controllers.js`)

**Get Messages with Pagination:**

```javascript
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const { limit = 50, cursor } = req.query;
    const myId = req.user._id;

    // Build query
    let query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    // Cursor-based pagination
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Fetch messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) + 1);

    // Check if there are more messages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove extra message
    }

    // Get cursor for next page
    const nextCursor = hasMore && messages.length > 0
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    res.status(200).json({
      messages: messages.reverse(),
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

**Cursor-Based Pagination Explained:**
1. Fetch `limit + 1` messages (e.g., 51 instead of 50)
2. If we get 51 messages, there are more (hasMore = true)
3. Remove the 51st message
4. Use the last message's timestamp as the cursor
5. Next request uses this cursor to fetch older messages

**Benefits over offset pagination:**
- Consistent results even when new messages arrive
- No duplicate or skipped messages
- Better performance for large datasets

**Send Message:**

```javascript
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // Real-time delivery via Socket.IO
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
```

---

## Real-time Features

### Socket.IO Implementation (`backend/src/lib/socket.js`)

**Setup with Redis Adapter:**

```javascript
import { Server } from "socket.io";
import http from "http";
import express from "express";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisClient } from "./redis.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Redis Adapter for horizontal scaling
export const initializeSocketIO = async () => {
  try {
    const redisClient = getRedisClient();
    const subClient = redisClient.duplicate();

    await subClient.connect();

    io.adapter(createAdapter(redisClient, subClient));
    console.log("✅ Socket.IO Redis Adapter initialized");
  } catch (error) {
    console.log("❌ Redis Adapter failed:", error.message);
  }
};
```

**Why Redis Adapter?**

Without Redis Adapter (Single Server):
```
User A connects to Server 1
User B connects to Server 1
✅ They can message each other (same server)
```

With Load Balancer (No Redis):
```
User A connects to Server 1
User B connects to Server 2
❌ They CANNOT message each other (different servers)
```

With Redis Adapter (Horizontal Scaling):
```
User A connects to Server 1
User B connects to Server 2
✅ They CAN message each other (Redis pub/sub)

Server 1 → Redis → Server 2
```

**Connection Handling:**

```javascript
const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;

  if (userId) {
    // Store socket ID
    userSocketMap[userId] = socket.id;

    // Update online users via Redis
    await setOnlineUser(userId, socket.id);

    // Broadcast online users
    io.emit("getOnlineUsers", await getOnlineUsers());
  }

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log("User disconnected", socket.id);

    if (userId) {
      delete userSocketMap[userId];
      await removeOnlineUser(userId);
      io.emit("getOnlineUsers", await getOnlineUsers());
    }
  });
});
```

**Sending Messages:**

```javascript
// Get receiver's socket ID
export const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

// In message controller
const receiverSocketId = getReceiverSocketId(receiverId);
if (receiverSocketId) {
  io.to(receiverSocketId).emit("newMessage", newMessage);
}
```

### Redis Integration (`backend/src/lib/redis.js`)

**Redis Client Setup:**

```javascript
import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => console.log('Redis Error:', err));
    redisClient.on('connect', () => console.log('✅ Redis connected'));

    await redisClient.connect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};
```

**Caching Functions:**

```javascript
// Cache user data (5 min TTL)
export const cacheUser = async (userId, userData) => {
  const key = `user:${userId}`;
  await redisClient.setEx(key, 300, JSON.stringify(userData)); // 5 min
};

// Get cached user
export const getCachedUser = async (userId) => {
  const key = `user:${userId}`;
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

// Online users management
export const setOnlineUser = async (userId, socketId) => {
  await redisClient.sAdd('online_users', userId);
  await redisClient.hSet('socket_user_map', socketId, userId);
};

export const removeOnlineUser = async (userId) => {
  await redisClient.sRem('online_users', userId);
};

export const getOnlineUsers = async () => {
  return await redisClient.sMembers('online_users');
};
```

**Redis Data Structures Used:**

1. **String** - User cache
   - Key: `user:{userId}`
   - Value: JSON stringified user data
   - TTL: 5 minutes

2. **Set** - Online users
   - Key: `online_users`
   - Members: Array of user IDs
   - No TTL (removed on disconnect)

3. **Hash** - Socket mapping
   - Key: `socket_user_map`
   - Fields: socketId → userId

---

## Frontend Implementation

### State Management

**Auth Store** (`frontend/Wisp/src/store/useAuthStore.js`):

```javascript
import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
    });

    socket.connect();

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    set({ socket: socket });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) {
      get().socket.disconnect();
    }
  },
}));
```

**Chat Store** (`frontend/Wisp/src/store/useChatStore.js`):

```javascript
import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data.messages });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;

      if (!isMessageSentFromSelectedUser) return;

      set({ messages: [...get().messages, newMessage] });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
}));
```

### Axios Configuration (`frontend/Wisp/src/lib/axios.js`)

```javascript
import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Send cookies with requests
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

---

## API Reference

### Authentication Endpoints

**POST `/api/auth/signup`**

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

Response (201):
```json
{
  "_id": "userId",
  "email": "user@example.com",
  "fullName": "John Doe",
  "profilePic": ""
}
```

Set-Cookie: `jwt=<token>; HttpOnly; SameSite=Strict`

---

**POST `/api/auth/login`**

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (200):
```json
{
  "_id": "userId",
  "email": "user@example.com",
  "fullName": "John Doe",
  "profilePic": "https://cloudinary.com/..."
}
```

---

**POST `/api/auth/logout`**

Response (200):
```json
{
  "message": "Logged out successfully"
}
```

Clears JWT cookie

---

**GET `/api/auth/check`**

Headers: `Cookie: jwt=<token>`

Response (200):
```json
{
  "_id": "userId",
  "email": "user@example.com",
  "fullName": "John Doe",
  "profilePic": ""
}
```

---

**PUT `/api/auth/update-profile`**

Headers: `Cookie: jwt=<token>`

Request:
```json
{
  "profilePic": "data:image/png;base64,..."
}
```

Response (200):
```json
{
  "_id": "userId",
  "email": "user@example.com",
  "fullName": "John Doe",
  "profilePic": "https://cloudinary.com/..."
}
```

---

### Message Endpoints

**GET `/api/messages/users`**

Headers: `Cookie: jwt=<token>`

Response (200):
```json
[
  {
    "_id": "userId",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "profilePic": ""
  }
]
```

---

**GET `/api/messages/:id?limit=50&cursor=2024-01-01T00:00:00.000Z`**

Headers: `Cookie: jwt=<token>`

Response (200):
```json
{
  "messages": [
    {
      "_id": "messageId",
      "senderId": "userId1",
      "receiverId": "userId2",
      "text": "Hello!",
      "image": null,
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "2024-01-01T11:00:00.000Z",
    "limit": 50
  }
}
```

---

**POST `/api/messages/send/:id`**

Headers: `Cookie: jwt=<token>`

Request:
```json
{
  "text": "Hello there!",
  "image": "data:image/png;base64,..." // optional
}
```

Response (201):
```json
{
  "_id": "messageId",
  "senderId": "userId1",
  "receiverId": "userId2",
  "text": "Hello there!",
  "image": "https://cloudinary.com/...",
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

---

### Health Check

**GET `/health`**

Response (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## Phase 3 Roadmap

### Advanced Features to Implement

#### 1. Group Chats & Channels
- New collections: `groups`, `group_members`
- Group message schema extension
- Socket.IO room-based broadcasting
- Group admin permissions

#### 2. Read Receipts
- Update message status to 'read'
- Track `readAt` timestamp
- Socket.IO event: `messageRead`
- UI indicators (double checkmarks)

#### 3. Message Search
- MongoDB text indexes on message content
- Search endpoint with full-text search
- Pagination for search results
- Highlight search terms in UI

#### 4. File Attachments
- Support for documents, videos, audio
- File type validation
- Size limits (e.g., 10MB)
- Progress indicators for uploads
- Cloudinary for storage

#### 5. Voice Messages
- Browser audio recording API
- Convert to MP3/AAC format
- Waveform visualization
- Playback controls

#### 6. Push Notifications
- Service Worker for web push
- FCM (Firebase Cloud Messaging)
- Notification preferences
- Email notifications (SendGrid/Mailgun)

---

## Summary of What We Built (Phase 1 & 2)

### Phase 1: Foundation
✅ MongoDB database with indexed schemas
✅ Express.js REST API
✅ JWT authentication with HTTP-only cookies
✅ Socket.IO for real-time messaging
✅ React frontend with Zustand state management
✅ Cloudinary image uploads
✅ Docker containerization

### Phase 2: Security & Scaling
✅ Redis integration for caching
✅ Socket.IO Redis Adapter (horizontal scaling)
✅ Rate limiting with Redis
✅ Input validation with Zod
✅ Helmet.js security headers
✅ Cursor-based pagination
✅ Docker Compose orchestration

### Key Achievements
- **Scalable**: Can handle multiple server instances with Redis
- **Secure**: Rate limiting, validation, security headers, bcrypt passwords
- **Performant**: Database indexes, Redis caching, efficient pagination
- **Production-Ready**: Docker, error handling, graceful shutdown

---

**This guide will be updated as we implement Phase 3 and Phase 4 features.**
