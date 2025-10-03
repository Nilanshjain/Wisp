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
            required: true,
            index: true, // Index for receiver queries
            // Can reference either User (for DMs) or Group (for group messages)
        },

        isGroupMessage: {
            type: Boolean,
            default: false,
            index: true,
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

        // NLP/Recall fields
        entities: [{
            type: {
                type: String,
                enum: ['person', 'place', 'organization', 'topic', 'temporal'],
            },
            value: String,
            category: String,
        }],

        concepts: [{
            type: String,
        }],

        importance: {
            type: Number,
            min: 0,
            max: 100,
            default: 50,
            index: true, // Index for importance filtering
        },

        sentiment: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            default: 'neutral',
        },

        keywords: [{
            type: String,
        }],

        relatedMessages: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        }],

        processingVersion: {
            type: String,
            default: '1.0',
        },

        processedAt: {
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

// Index for group messages
messageSchema.index({ receiverId: 1, isGroupMessage: 1, createdAt: -1 });

// Recall indexes for NLP features
messageSchema.index({ concepts: 1 }); // Search by concepts
messageSchema.index({ 'entities.value': 1 }); // Search by entity values
messageSchema.index({ importance: -1, createdAt: -1 }); // Sort by importance
messageSchema.index({ keywords: 1 }); // Search by keywords

const Message = mongoose.model("Message", messageSchema);

export default Message;

