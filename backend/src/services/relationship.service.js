import Concept from '../models/concept.model.js';
import Message from '../models/message.model.js';
import { calculateSimilarity } from './nlp.service.js';

/**
 * Relationship Service for Recall
 * Manages concept graph, relationships, threading, and déjà vu detection
 */

/**
 * Create or update a concept
 * @param {String} userId - User ID
 * @param {String} name - Concept name
 * @param {String} type - Concept type
 * @param {String} conversationId - Conversation ID
 * @param {String} messageId - Message ID
 * @param {Boolean} isGroupConversation - Is group conversation
 * @returns {Promise<Concept>}
 */
export async function createOrUpdateConcept(userId, name, type, conversationId, messageId, isGroupConversation = false) {
	try {
		const normalizedName = name.toLowerCase().trim();

		// Find or create concept
		let concept = await Concept.findOne({
			userId,
			name: normalizedName,
		});

		if (concept) {
			// Update existing concept
			concept.weight += 1;
			concept.lastMentioned = new Date();

			// Add message if not already present
			if (!concept.messages.includes(messageId)) {
				concept.messages.push(messageId);
			}

			// Update conversation if changed
			if (conversationId && concept.conversationId !== conversationId) {
				concept.conversationId = conversationId;
			}

			await concept.save();
		} else {
			// Create new concept
			concept = await Concept.create({
				name: normalizedName,
				type,
				userId,
				conversationId,
				isGroupConversation,
				messages: [messageId],
				weight: 1,
				firstMentioned: new Date(),
				lastMentioned: new Date(),
			});
		}

		return concept;
	} catch (error) {
		console.error('Error creating/updating concept:', error);
		throw error;
	}
}

/**
 * Update concept connections based on co-occurrence
 * @param {Array} concepts - Array of concept objects
 * @param {String} userId - User ID
 */
export async function updateConceptConnections(concepts, userId) {
	try {
		// For each pair of concepts in the message
		for (let i = 0; i < concepts.length; i++) {
			for (let j = i + 1; j < concepts.length; j++) {
				const concept1 = concepts[i];
				const concept2 = concepts[j];

				// Update connection from concept1 to concept2
				await updateSingleConnection(concept1._id, concept2._id);

				// Update connection from concept2 to concept1 (bidirectional)
				await updateSingleConnection(concept2._id, concept1._id);
			}
		}
	} catch (error) {
		console.error('Error updating concept connections:', error);
	}
}

/**
 * Update a single connection between two concepts
 * @param {String} fromConceptId - Source concept ID
 * @param {String} toConceptId - Target concept ID
 */
async function updateSingleConnection(fromConceptId, toConceptId) {
	try {
		const concept = await Concept.findById(fromConceptId);
		if (!concept) return;

		// Find existing connection
		const existingConnection = concept.connections.find(
			(conn) => conn.conceptId.toString() === toConceptId.toString()
		);

		if (existingConnection) {
			// Increment co-occurrence
			existingConnection.coOccurrences += 1;
			// Update strength (max 100)
			existingConnection.strength = Math.min(existingConnection.coOccurrences * 5, 100);
		} else {
			// Add new connection
			concept.connections.push({
				conceptId: toConceptId,
				strength: 5,
				coOccurrences: 1,
			});
		}

		await concept.save();
	} catch (error) {
		console.error('Error updating single connection:', error);
	}
}

/**
 * Get concept graph for a conversation
 * @param {String} userId - User ID
 * @param {String} conversationId - Conversation ID
 * @returns {Promise<Object>} Graph data with nodes and edges
 */
export async function getConceptGraph(userId, conversationId) {
	try {
		const concepts = await Concept.find({
			userId,
			conversationId,
		})
			.sort({ weight: -1 })
			.limit(50)
			.populate('connections.conceptId', 'name type weight');

		// Format for D3.js
		const nodes = concepts.map((concept) => ({
			id: concept._id.toString(),
			name: concept.name,
			type: concept.type,
			weight: concept.weight,
			messageCount: concept.messages.length,
		}));

		const edges = [];
		const nodeIds = new Set(nodes.map((n) => n.id));

		concepts.forEach((concept) => {
			concept.connections.forEach((conn) => {
				const targetId = conn.conceptId._id.toString();
				// Only include edges where both nodes are in the graph
				if (nodeIds.has(targetId) && conn.strength > 0) {
					edges.push({
						source: concept._id.toString(),
						target: targetId,
						strength: conn.strength,
					});
				}
			});
		});

		return {
			nodes,
			edges,
		};
	} catch (error) {
		console.error('Error getting concept graph:', error);
		throw error;
	}
}

/**
 * Find related messages based on concept overlap
 * @param {String} messageId - Source message ID
 * @param {Number} limit - Max number of related messages
 * @returns {Promise<Array>} Related messages
 */
export async function findRelatedMessages(messageId, limit = 10) {
	try {
		const sourceMessage = await Message.findById(messageId);
		if (!sourceMessage || !sourceMessage.concepts || sourceMessage.concepts.length === 0) {
			return [];
		}

		// Find messages with overlapping concepts
		const relatedMessages = await Message.find({
			_id: { $ne: messageId },
			senderId: sourceMessage.senderId,
			concepts: { $in: sourceMessage.concepts },
		})
			.sort({ createdAt: -1 })
			.limit(limit)
			.populate('senderId', 'fullName profilePic')
			.populate('receiverId', 'fullName profilePic');

		// Calculate similarity scores
		const messagesWithScores = relatedMessages.map((msg) => {
			const overlap = msg.concepts.filter((c) => sourceMessage.concepts.includes(c)).length;
			const totalConcepts = new Set([...msg.concepts, ...sourceMessage.concepts]).size;
			const similarity = totalConcepts > 0 ? overlap / totalConcepts : 0;

			return {
				...msg.toObject(),
				similarityScore: similarity,
			};
		});

		// Sort by similarity
		return messagesWithScores.sort((a, b) => b.similarityScore - a.similarityScore);
	} catch (error) {
		console.error('Error finding related messages:', error);
		throw error;
	}
}

/**
 * Auto-threading: Find messages that should be threaded together
 * @param {String} messageId - New message ID
 * @param {Number} threshold - Similarity threshold (0-1)
 * @returns {Promise<Array>} Thread messages
 */
export async function detectThread(messageId, threshold = 0.4) {
	try {
		const message = await Message.findById(messageId);
		if (!message || !message.text) return [];

		// Find messages in same conversation from last 30 days
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const candidateMessages = await Message.find({
			_id: { $ne: messageId },
			$or: [
				{ senderId: message.senderId, receiverId: message.receiverId },
				{ senderId: message.receiverId, receiverId: message.senderId },
			],
			createdAt: { $gte: thirtyDaysAgo },
			text: { $exists: true, $ne: '' },
		}).sort({ createdAt: -1 });

		// Calculate semantic similarity
		const threadMessages = [];
		for (const candidate of candidateMessages) {
			const similarity = calculateSimilarity(message.text, candidate.text);
			if (similarity >= threshold) {
				threadMessages.push({
					...candidate.toObject(),
					similarityScore: similarity,
				});
			}
		}

		return threadMessages.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 10);
	} catch (error) {
		console.error('Error detecting thread:', error);
		throw error;
	}
}

/**
 * Déjà vu detection: Find if user discussed this topic before
 * @param {String} userId - User ID
 * @param {Array} concepts - Current message concepts
 * @param {Number} dayThreshold - Minimum days gap for déjà vu
 * @param {Number} similarityThreshold - Minimum similarity score
 * @returns {Promise<Object|null>} Previous discussion or null
 */
export async function detectDejaVu(userId, concepts, dayThreshold = 7, similarityThreshold = 0.6) {
	try {
		if (!concepts || concepts.length === 0) return null;

		const thresholdDate = new Date();
		thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);

		// Find messages with similar concepts from the past
		const pastMessages = await Message.find({
			senderId: userId,
			concepts: { $in: concepts },
			createdAt: { $lt: thresholdDate },
		})
			.sort({ createdAt: -1 })
			.limit(20)
			.populate('receiverId', 'fullName profilePic');

		// Calculate similarity
		for (const pastMsg of pastMessages) {
			const overlap = pastMsg.concepts.filter((c) => concepts.includes(c)).length;
			const totalConcepts = new Set([...pastMsg.concepts, ...concepts]).size;
			const similarity = totalConcepts > 0 ? overlap / totalConcepts : 0;

			if (similarity >= similarityThreshold) {
				const daysAgo = Math.floor((new Date() - pastMsg.createdAt) / (1000 * 60 * 60 * 24));
				return {
					message: pastMsg,
					similarity,
					daysAgo,
					sharedConcepts: pastMsg.concepts.filter((c) => concepts.includes(c)),
				};
			}
		}

		return null;
	} catch (error) {
		console.error('Error detecting déjà vu:', error);
		return null;
	}
}

/**
 * Get top concepts for a user
 * @param {String} userId - User ID
 * @param {Number} limit - Number of concepts to return
 * @returns {Promise<Array>} Top concepts
 */
export async function getTopConcepts(userId, limit = 10) {
	try {
		return await Concept.find({ userId }).sort({ weight: -1 }).limit(limit);
	} catch (error) {
		console.error('Error getting top concepts:', error);
		throw error;
	}
}

/**
 * Get trending concepts (recently active)
 * @param {String} userId - User ID
 * @param {Number} days - Number of days to look back
 * @param {Number} limit - Number of concepts to return
 * @returns {Promise<Array>} Trending concepts
 */
export async function getTrendingConcepts(userId, days = 7, limit = 10) {
	try {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		return await Concept.find({
			userId,
			lastMentioned: { $gte: startDate },
		})
			.sort({ weight: -1, lastMentioned: -1 })
			.limit(limit);
	} catch (error) {
		console.error('Error getting trending concepts:', error);
		throw error;
	}
}
