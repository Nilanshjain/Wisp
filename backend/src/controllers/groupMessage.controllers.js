import Group from '../models/group.model.js';
import GroupMember from '../models/groupMember.model.js';
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';
import { io } from '../lib/socket.js';

// Send message to group
export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const { groupId } = req.params;
        const senderId = req.user._id;

        // Check if user is an active member
        const membership = await GroupMember.findOne({
            groupId,
            userId: senderId,
            status: 'active',
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Check if user has permission to send messages
        if (!membership.permissions.canSendMessages) {
            return res.status(403).json({ error: 'You do not have permission to send messages in this group' });
        }

        // Check group settings
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // If whoCanMessage is 'admins_only', check if user is admin or owner
        if (group.settings.whoCanMessage === 'admins_only') {
            if (!['owner', 'admin'].includes(membership.role)) {
                return res.status(403).json({ error: 'Only admins can send messages in this group' });
            }
        }

        // Upload image if provided
        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        // Create message (receiverId is the groupId for group messages)
        const newMessage = new Message({
            senderId,
            receiverId: groupId,
            text,
            image: imageUrl,
            isGroupMessage: true,
        });

        await newMessage.save();

        // Update group stats
        group.stats.totalMessages += 1;
        await group.save();

        // Populate sender details
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'username profilePic');

        // Get all active group members
        const groupMembers = await GroupMember.find({
            groupId,
            status: 'active',
            userId: { $ne: senderId }, // Exclude sender
        });

        // Emit to all group members via Socket.IO
        // We'll use a room named after the groupId
        io.to(groupId.toString()).emit('newGroupMessage', {
            message: populatedMessage,
            groupId,
        });

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Error in sendGroupMessage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get group messages with pagination
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;
        const { limit = 50, cursor } = req.query;

        // Check if user is a member
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: { $in: ['active', 'pending'] },
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Build query - messages where receiverId is the groupId
        const query = {
            receiverId: groupId,
            isGroupMessage: true,
        };

        // Add cursor-based pagination
        if (cursor) {
            query._id = { $lt: cursor }; // Get messages before cursor
        }

        // Fetch messages with limit + 1 to check if there are more
        const messages = await Message.find(query)
            .populate('senderId', 'username profilePic')
            .sort({ createdAt: -1 }) // Newest first
            .limit(parseInt(limit) + 1);

        // Check if there are more messages
        const hasMore = messages.length > limit;
        const returnedMessages = hasMore ? messages.slice(0, limit) : messages;

        // Reverse to show oldest first in UI
        const sortedMessages = returnedMessages.reverse();

        // Get next cursor (ID of the last message)
        const nextCursor = hasMore ? returnedMessages[returnedMessages.length - 1]._id : null;

        // Update lastReadAt for this member
        membership.lastReadAt = new Date();
        await membership.save();

        res.status(200).json({
            messages: sortedMessages,
            pagination: {
                hasMore,
                nextCursor,
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('Error in getGroupMessages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete group message (admin/owner or message sender)
export const deleteGroupMessage = async (req, res) => {
    try {
        const { groupId, messageId } = req.params;
        const userId = req.user._id;

        // Get membership
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Get message
        const message = await Message.findById(messageId);
        if (!message || message.receiverId.toString() !== groupId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check permissions: user is message sender OR has admin/owner role
        const canDelete =
            message.senderId.toString() === userId.toString() ||
            ['owner', 'admin'].includes(membership.role);

        if (!canDelete) {
            return res.status(403).json({ error: 'You do not have permission to delete this message' });
        }

        await Message.findByIdAndDelete(messageId);

        // Update group stats
        const group = await Group.findById(groupId);
        if (group) {
            group.stats.totalMessages = Math.max(0, group.stats.totalMessages - 1);
            await group.save();
        }

        // Notify all group members via Socket.IO
        io.to(groupId.toString()).emit('groupMessageDeleted', {
            messageId,
            groupId,
        });

        res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error in deleteGroupMessage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Mark group messages as read
export const markGroupMessagesAsRead = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is a member
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Update lastReadAt for this member
        membership.lastReadAt = new Date();
        await membership.save();

        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error in markGroupMessagesAsRead:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get unread message count for group
export const getUnreadGroupMessageCount = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        // Check if user is a member
        const membership = await GroupMember.findOne({
            groupId,
            userId,
            status: 'active',
        });

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Count messages created after user's lastReadAt
        const unreadCount = await Message.countDocuments({
            receiverId: groupId,
            isGroupMessage: true,
            senderId: { $ne: userId }, // Exclude own messages
            createdAt: { $gt: membership.lastReadAt },
        });

        res.status(200).json({ unreadCount });
    } catch (error) {
        console.error('Error in getUnreadGroupMessageCount:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
