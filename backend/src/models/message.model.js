import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true, // Index for sender queries
        },

        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true, // Index for receiver queries
        },

        text: {
            type: String,
            trim: true,
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
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient message queries
// Index for fetching conversation between two users
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// Index for finding unread messages
messageSchema.index({ receiverId: 1, status: 1 });

// Index for time-based queries (sorting by creation date)
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;

