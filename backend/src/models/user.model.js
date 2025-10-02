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

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false, // Don't include password in queries by default
        },

        profilePic: {
            type: String,
            default: "",
        },

        lastSeen: {
            type: Date,
            default: Date.now,
        },

    },
    {
        timestamps: true,
        // Add indexes for common query patterns
        indexes: [
            { email: 1 },
            { createdAt: -1 },
        ]
    }
);

// Compound index for sorting users by creation date
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);

export default User;