import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
            index: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Member role in the group
        role: {
            type: String,
            enum: ['owner', 'admin', 'member'],
            default: 'member',
        },

        // Custom nickname in the group
        nickname: {
            type: String,
            trim: true,
            maxlength: 30,
        },

        // Join status
        status: {
            type: String,
            enum: ['active', 'pending', 'banned', 'left'],
            default: 'active',
        },

        // Permissions
        permissions: {
            canSendMessages: {
                type: Boolean,
                default: true,
            },
            canAddMembers: {
                type: Boolean,
                default: false,
            },
            canRemoveMembers: {
                type: Boolean,
                default: false,
            },
            canEditGroup: {
                type: Boolean,
                default: false,
            },
        },

        // Mute settings
        isMuted: {
            type: Boolean,
            default: false,
        },

        mutedUntil: {
            type: Date,
        },

        // Timestamps
        joinedAt: {
            type: Date,
            default: Date.now,
        },

        lastReadAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ groupId: 1, status: 1 });
groupMemberSchema.index({ userId: 1, status: 1 });
groupMemberSchema.index({ groupId: 1, role: 1 });

// Pre-save middleware to set permissions based on role
groupMemberSchema.pre('save', function(next) {
    if (this.isModified('role')) {
        switch(this.role) {
            case 'owner':
                this.permissions = {
                    canSendMessages: true,
                    canAddMembers: true,
                    canRemoveMembers: true,
                    canEditGroup: true,
                };
                break;
            case 'admin':
                this.permissions = {
                    canSendMessages: true,
                    canAddMembers: true,
                    canRemoveMembers: true,
                    canEditGroup: true,
                };
                break;
            case 'member':
                this.permissions = {
                    canSendMessages: true,
                    canAddMembers: false,
                    canRemoveMembers: false,
                    canEditGroup: false,
                };
                break;
        }
    }
    next();
});

const GroupMember = mongoose.model("GroupMember", groupMemberSchema);

export default GroupMember;
