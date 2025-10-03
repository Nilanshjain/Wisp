import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import express from "express";
import { createClient } from "redis";
import GroupMember from "../models/groupMember.model.js";
import {
    mapSocketToUser,
    removeSocketMapping,
    setUserOnline,
    setUserOffline,
    getOnlineUsers,
    getSocketIdByUserId
} from "./redis.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

/**
 * Initialize Redis Adapter for Socket.IO horizontal scaling
 */
export const initializeSocketIO = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        // Create pub/sub clients for Socket.IO adapter
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        // Use Redis adapter for multi-instance support
        io.adapter(createAdapter(pubClient, subClient));

        console.log('✅ Socket.IO Redis Adapter initialized - Multi-instance support enabled');

        // Handle adapter errors
        pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
        subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

    } catch (error) {
        console.warn('⚠️  Redis Adapter initialization failed. Running in single-instance mode.', error.message);
    }
};

/**
 * Get receiver's socket ID from Redis
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Socket ID or null
 */
export async function getReceiverSocketId(userId) {
    return await getSocketIdByUserId(userId);
}

/**
 * Socket.IO connection handler with Redis-backed presence
 */
io.on("connection", async (socket) => {
    console.log("✅ User connected:", socket.id);

    const userId = socket.handshake.query.userId;

    if (userId && userId !== 'undefined') {
        try {
            // Store socket-user mapping in Redis
            await mapSocketToUser(socket.id, userId);

            // Set user as online in Redis
            await setUserOnline(userId);

            // Join user's groups (as Socket.IO rooms)
            const userGroups = await GroupMember.find({
                userId,
                status: 'active',
            }).select('groupId');

            for (const membership of userGroups) {
                socket.join(membership.groupId.toString());
                console.log(`👥 User ${userId} joined group room: ${membership.groupId}`);
            }

            // Broadcast online users to all clients
            const onlineUsers = await getOnlineUsers();
            io.emit("getOnlineUsers", onlineUsers);

            console.log(`📡 User ${userId} is now online`);
        } catch (error) {
            console.error('Error handling user connection:', error);
        }
    }

    // Handle user disconnect
    socket.on("disconnect", async () => {
        console.log("❌ User disconnected:", socket.id);

        if (userId && userId !== 'undefined') {
            try {
                // Remove socket mapping from Redis
                await removeSocketMapping(socket.id);

                // Set user as offline in Redis
                await setUserOffline(userId);

                // Broadcast updated online users list
                const onlineUsers = await getOnlineUsers();
                io.emit("getOnlineUsers", onlineUsers);

                console.log(`📴 User ${userId} is now offline`);
            } catch (error) {
                console.error('Error handling user disconnect:', error);
            }
        }
    });

    // Handle typing indicator (DM)
    socket.on("typing", async (data) => {
        const receiverSocketId = await getReceiverSocketId(data.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("userTyping", {
                senderId: userId,
                isTyping: data.isTyping
            });
        }
    });

    // Handle group typing indicator
    socket.on("groupTyping", async (data) => {
        const { groupId, isTyping } = data;

        // Broadcast to all group members except sender
        socket.to(groupId).emit("userTypingInGroup", {
            groupId,
            senderId: userId,
            isTyping
        });
    });

    // Handle joining a new group (when user is added to group)
    socket.on("joinGroup", async (data) => {
        const { groupId } = data;

        // Verify user is a member of this group
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (membership) {
            socket.join(groupId);
            console.log(`👥 User ${userId} joined group room: ${groupId}`);

            // Notify the user they've joined successfully
            socket.emit("groupJoined", { groupId });
        }
    });

    // Handle leaving a group
    socket.on("leaveGroup", (data) => {
        const { groupId } = data;
        socket.leave(groupId);
        console.log(`👋 User ${userId} left group room: ${groupId}`);
    });
});

export { io, app, server };


