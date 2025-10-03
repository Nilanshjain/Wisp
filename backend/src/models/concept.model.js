import mongoose from 'mongoose';

/**
 * Concept Model
 * Represents nodes in the memory graph
 * Stores topics, entities, and their relationships
 */

const conceptSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
			index: true,
		},

		type: {
			type: String,
			enum: ['person', 'place', 'organization', 'topic', 'event', 'thing'],
			default: 'topic',
			index: true,
		},

		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},

		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			// Can reference either a User (for DMs) or Group (for group chats)
			index: true,
		},

		isGroupConversation: {
			type: Boolean,
			default: false,
		},

		messages: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Message',
			},
		],

		connections: [
			{
				conceptId: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Concept',
				},
				strength: {
					type: Number,
					min: 0,
					max: 100,
					default: 0,
				},
				coOccurrences: {
					type: Number,
					default: 1,
				},
			},
		],

		weight: {
			type: Number,
			default: 1,
			min: 0,
		},

		firstMentioned: {
			type: Date,
			required: true,
			default: Date.now,
		},

		lastMentioned: {
			type: Date,
			required: true,
			default: Date.now,
			index: true,
		},

		metadata: {
			type: mongoose.Schema.Types.Mixed,
			default: {},
		},
	},
	{
		timestamps: true,
	}
);

// Compound indexes for efficient concept queries
conceptSchema.index({ userId: 1, conversationId: 1 });
conceptSchema.index({ userId: 1, name: 1 }, { unique: true }); // Unique concept per user
conceptSchema.index({ userId: 1, weight: -1 }); // Most frequent concepts
conceptSchema.index({ userId: 1, lastMentioned: -1 }); // Recent concepts
conceptSchema.index({ name: 'text' }); // Text search on concept names

// Compound index for conversation-specific concepts
conceptSchema.index({ userId: 1, conversationId: 1, weight: -1 });

// Index for finding concepts by type
conceptSchema.index({ userId: 1, type: 1, weight: -1 });

const Concept = mongoose.model('Concept', conceptSchema);

export default Concept;
