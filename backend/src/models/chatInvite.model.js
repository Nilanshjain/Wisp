import mongoose from "mongoose";

const chatInviteSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for finding invites between two users
chatInviteSchema.index({ senderId: 1, receiverId: 1 });
chatInviteSchema.index({ receiverId: 1, status: 1 }); // For fetching pending invites

const ChatInvite = mongoose.model("ChatInvite", chatInviteSchema);

export default ChatInvite;
