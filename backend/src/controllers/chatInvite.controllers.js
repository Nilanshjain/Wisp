import ChatInvite from "../models/chatInvite.model.js";
import User from "../models/user.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/**
 * Send a chat invite to a user
 * POST /api/invites/send/:userId
 */
export const sendChatInvite = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Can't invite yourself
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if invite already exists (in either direction)
    const existingInvite = await ChatInvite.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });

    if (existingInvite) {
      if (existingInvite.status === "pending") {
        return res.status(400).json({ error: "Chat invite already pending" });
      }
      if (existingInvite.status === "accepted") {
        return res.status(400).json({ error: "You are already connected" });
      }
      // If rejected, allow sending a new invite
      if (existingInvite.status === "rejected") {
        existingInvite.status = "pending";
        existingInvite.senderId = senderId;
        existingInvite.receiverId = receiverId;
        await existingInvite.save();

        // Notify receiver via Socket.IO
        const receiverSocketId = await getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newChatInvite", {
            ...existingInvite.toObject(),
            sender: req.user
          });
        }

        return res.status(200).json(existingInvite);
      }
    }

    // Create new invite
    const newInvite = new ChatInvite({
      senderId,
      receiverId,
    });

    await newInvite.save();

    // Notify receiver via Socket.IO
    const receiverSocketId = await getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newChatInvite", {
        ...newInvite.toObject(),
        sender: req.user
      });
    }

    res.status(201).json(newInvite);
  } catch (error) {
    console.error("Error in sendChatInvite:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Accept a chat invite
 * PUT /api/invites/accept/:inviteId
 */
export const acceptChatInvite = async (req, res) => {
  try {
    const { id: inviteId } = req.params;
    const userId = req.user._id;

    const invite = await ChatInvite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Only the receiver can accept
    if (invite.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only accept invites sent to you" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ error: "Invite is no longer pending" });
    }

    invite.status = "accepted";
    await invite.save();

    // Notify sender via Socket.IO
    const senderSocketId = await getReceiverSocketId(invite.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("chatInviteAccepted", {
        inviteId: invite._id,
        acceptedBy: req.user
      });
    }

    res.status(200).json(invite);
  } catch (error) {
    console.error("Error in acceptChatInvite:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Reject a chat invite
 * PUT /api/invites/reject/:inviteId
 */
export const rejectChatInvite = async (req, res) => {
  try {
    const { id: inviteId } = req.params;
    const userId = req.user._id;

    const invite = await ChatInvite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Only the receiver can reject
    if (invite.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only reject invites sent to you" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ error: "Invite is no longer pending" });
    }

    invite.status = "rejected";
    await invite.save();

    // Notify sender via Socket.IO
    const senderSocketId = await getReceiverSocketId(invite.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("chatInviteRejected", {
        inviteId: invite._id,
        rejectedBy: userId
      });
    }

    res.status(200).json(invite);
  } catch (error) {
    console.error("Error in rejectChatInvite:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get pending invites for the logged-in user
 * GET /api/invites/pending
 */
export const getPendingInvites = async (req, res) => {
  try {
    const userId = req.user._id;

    const invites = await ChatInvite.find({
      receiverId: userId,
      status: "pending"
    })
      .populate("senderId", "fullName username profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(invites);
  } catch (error) {
    console.error("Error in getPendingInvites:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get sent invites (by the logged-in user)
 * GET /api/invites/sent
 */
export const getSentInvites = async (req, res) => {
  try {
    const userId = req.user._id;

    const invites = await ChatInvite.find({
      senderId: userId,
      status: "pending"
    })
      .populate("receiverId", "fullName username profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(invites);
  } catch (error) {
    console.error("Error in getSentInvites:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Cancel a sent invite
 * DELETE /api/invites/cancel/:inviteId
 */
export const cancelChatInvite = async (req, res) => {
  try {
    const { id: inviteId } = req.params;
    const userId = req.user._id;

    const invite = await ChatInvite.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Only the sender can cancel
    if (invite.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only cancel invites you sent" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ error: "Can only cancel pending invites" });
    }

    await invite.deleteOne();

    // Notify receiver via Socket.IO
    const receiverSocketId = await getReceiverSocketId(invite.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("chatInviteCancelled", {
        inviteId: invite._id
      });
    }

    res.status(200).json({ message: "Invite cancelled successfully" });
  } catch (error) {
    console.error("Error in cancelChatInvite:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
