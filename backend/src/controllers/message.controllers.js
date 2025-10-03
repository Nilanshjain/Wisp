import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ChatInvite from "../models/chatInvite.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all accepted invites (both sent and received)
    const acceptedInvites = await ChatInvite.find({
      $or: [
        { senderId: loggedInUserId, status: "accepted" },
        { receiverId: loggedInUserId, status: "accepted" }
      ]
    });

    // Extract user IDs from accepted invites
    const connectedUserIds = acceptedInvites.map(invite =>
      invite.senderId.toString() === loggedInUserId.toString()
        ? invite.receiverId
        : invite.senderId
    );

    // Also find users with existing message history (legacy support)
    const existingConversations = await Message.distinct("senderId", {
      receiverId: loggedInUserId
    });
    const sentMessages = await Message.distinct("receiverId", {
      senderId: loggedInUserId
    });

    const conversationUserIds = [...new Set([
      ...existingConversations.map(id => id.toString()),
      ...sentMessages.map(id => id.toString())
    ])];

    // Combine and deduplicate user IDs
    const allConnectedUserIds = [...new Set([
      ...connectedUserIds.map(id => id.toString()),
      ...conversationUserIds
    ])];

    // Fetch user details
    const users = await User.find({
      _id: { $in: allConnectedUserIds }
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { limit = 50, cursor } = req.query;

    // Build query
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    // Add cursor-based pagination
    if (cursor) {
      query._id = { $lt: cursor }; // Get messages before cursor
    }

    // Fetch messages with limit + 1 to check if there are more
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .limit(parseInt(limit) + 1);

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const returnedMessages = hasMore ? messages.slice(0, limit) : messages;

    // Reverse to show oldest first in UI
    const sortedMessages = returnedMessages.reverse();

    // Get next cursor (ID of the last message)
    const nextCursor = hasMore ? returnedMessages[returnedMessages.length - 1]._id : null;

    res.status(200).json({
      messages: sortedMessages,
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload image to Cloudinary
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

    // Get receiver's socket ID from Redis (async)
    const receiverSocketId = await getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Mark messages as read
 * PUT /api/messages/read/:userId
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;

    // Update all unread messages from this sender
    const result = await Message.updateMany(
      {
        senderId: senderId,
        receiverId: receiverId,
        status: { $ne: 'read' }
      },
      {
        $set: {
          status: 'read',
          readAt: new Date()
        }
      }
    );

    // Get updated message IDs to notify sender
    const readMessages = await Message.find({
      senderId: senderId,
      receiverId: receiverId,
      status: 'read'
    }).select('_id');

    // Notify sender via Socket.IO
    const senderSocketId = await getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", {
        readBy: receiverId,
        messageIds: readMessages.map(m => m._id),
        readAt: new Date()
      });
    }

    res.status(200).json({
      message: "Messages marked as read",
      count: result.modifiedCount
    });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};