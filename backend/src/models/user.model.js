import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, // Index for faster email lookups
        },

        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
            index: true, // Index for username lookups
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: function() {
                // Password is only required if not using OAuth
                return !this.authProvider || this.authProvider === 'local';
            },
            minlength: 6,
            select: false, // Don't include password in queries by default
        },

        profilePic: {
            type: String,
            default: "",
        },

        // OAuth fields
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },

        providerId: {
            type: String,
            sparse: true, // Allow null values but enforce uniqueness when set
        },

        // Role-based access control
        role: {
            type: String,
            enum: ['user', 'moderator', 'admin'],
            default: 'user',
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        lastSeen: {
            type: Date,
            default: Date.now,
        },

    },
    {
        timestamps: true,
    }
);

// Indexes for performance (email and createdAt defined here once)
userSchema.index({ createdAt: -1 });

// Text index for search functionality (now includes username)
userSchema.index({ fullName: 'text', email: 'text', username: 'text' });

const User = mongoose.model("User", userSchema);

export default User;