import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 50,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        groupImage: {
            type: String,
            default: "",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Group type: public or private
        type: {
            type: String,
            enum: ['public', 'private'],
            default: 'private',
        },

        // Maximum members allowed
        maxMembers: {
            type: Number,
            default: 100,
            min: 2,
            max: 1000,
        },

        // Group settings
        settings: {
            // Who can send messages
            whoCanMessage: {
                type: String,
                enum: ['all', 'admins_only'],
                default: 'all',
            },
            // Who can add members
            whoCanAddMembers: {
                type: String,
                enum: ['all', 'admins_only', 'owner_only'],
                default: 'admins_only',
            },
            // Approval required to join
            requireApproval: {
                type: Boolean,
                default: false,
            },
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // Statistics
        stats: {
            totalMembers: {
                type: Number,
                default: 1,
            },
            totalMessages: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance (createdBy already indexed in schema definition)
groupSchema.index({ type: 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ createdAt: -1 });

// Text index for search
groupSchema.index({ name: 'text', description: 'text' });

const Group = mongoose.model("Group", groupSchema);

export default Group;
