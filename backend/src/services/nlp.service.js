import nlp from 'compromise';
import natural from 'natural';
import Sentiment from 'sentiment';
import { removeStopwords } from 'stopword';

const sentiment = new Sentiment();
const { TfIdf } = natural;

/**
 * NLP Service for Recall
 * Provides message analysis including entity extraction, importance scoring,
 * sentiment analysis, and concept generation
 */

/**
 * Extract entities from text
 * Returns people, places, organizations, topics, and temporal references
 */
export function extractEntities(text) {
	if (!text || typeof text !== 'string') return [];

	const doc = nlp(text);
	const entities = [];

	// Extract people (names, pronouns)
	const people = doc.people().out('array');
	people.forEach((person) => {
		entities.push({
			type: 'person',
			value: person,
			category: 'entity',
		});
	});

	// Extract places/locations
	const places = doc.places().out('array');
	places.forEach((place) => {
		entities.push({
			type: 'place',
			value: place,
			category: 'location',
		});
	});

	// Extract organizations
	const organizations = doc.organizations().out('array');
	organizations.forEach((org) => {
		entities.push({
			type: 'organization',
			value: org,
			category: 'entity',
		});
	});

	// Extract topics (nouns and noun phrases)
	const topics = doc.topics().out('array');
	topics.forEach((topic) => {
		if (topic.length > 2) {
			// Filter out very short topics
			entities.push({
				type: 'topic',
				value: topic,
				category: 'subject',
			});
		}
	});

	// Extract temporal references (dates, times)
	const dates = doc.dates().out('array');
	dates.forEach((date) => {
		entities.push({
			type: 'temporal',
			value: date,
			category: 'time',
		});
	});

	return entities;
}

/**
 * Calculate importance score (0-100)
 * Factors: urgency keywords, questions, actions, entities, sentiment, length
 */
export function calculateImportance(text, context = {}) {
	if (!text || typeof text !== 'string') return 50;

	let score = 50; // Base score
	const doc = nlp(text);
	const lowerText = text.toLowerCase();

	// 1. Urgency keywords (+20)
	const urgencyKeywords = ['urgent', 'asap', 'important', 'critical', 'emergency', 'now', 'immediately'];
	if (urgencyKeywords.some((keyword) => lowerText.includes(keyword))) {
		score += 20;
	}

	// 2. Question markers (+15)
	if (text.includes('?') || doc.questions().length > 0) {
		score += 15;
	}

	// 3. Action words (+10)
	const actionWords = ['meet', 'call', 'send', 'need', 'must', 'should', 'have to', 'deadline'];
	const actionCount = actionWords.filter((word) => lowerText.includes(word)).length;
	score += Math.min(actionCount * 5, 10);

	// 4. Emotional intensity (+10)
	const exclamationCount = (text.match(/!/g) || []).length;
	const capsWords = text.split(' ').filter((word) => word === word.toUpperCase() && word.length > 2).length;
	if (exclamationCount > 0 || capsWords > 0) {
		score += 10;
	}

	// 5. Entity density (+15)
	const entities = extractEntities(text);
	const entityScore = Math.min(entities.length * 3, 15);
	score += entityScore;

	// 6. Sentiment strength (+10)
	const sentimentResult = sentiment.analyze(text);
	if (Math.abs(sentimentResult.score) > 3) {
		score += 10;
	}

	// 7. Length/complexity (+10)
	const wordCount = text.split(' ').length;
	if (wordCount > 20) {
		score += 10;
	}

	// 8. Context factors
	if (context.isReply) score += 5;
	if (context.mentionsUser) score += 10;
	if (context.hasImage) score += 5;

	// Normalize to 0-100
	return Math.min(Math.max(score, 0), 100);
}

/**
 * Analyze sentiment
 * Returns: positive, negative, or neutral
 */
export function analyzeSentiment(text) {
	if (!text || typeof text !== 'string') return 'neutral';

	const result = sentiment.analyze(text);

	if (result.score > 1) return 'positive';
	if (result.score < -1) return 'negative';
	return 'neutral';
}

/**
 * Extract keywords using TF-IDF and stopword removal
 */
export function extractKeywords(text, maxKeywords = 5) {
	if (!text || typeof text !== 'string') return [];

	// Tokenize
	const tokenizer = new natural.WordTokenizer();
	const words = tokenizer.tokenize(text.toLowerCase());

	// Remove stopwords
	const filtered = removeStopwords(words);

	// Use TF-IDF for keyword extraction
	const tfidf = new TfIdf();
	tfidf.addDocument(filtered.join(' '));

	const keywords = [];
	tfidf.listTerms(0).slice(0, maxKeywords).forEach((item) => {
		if (item.term.length > 2) {
			keywords.push(item.term);
		}
	});

	return keywords;
}

/**
 * Generate concepts/topics from text
 * Combines entities, keywords, and thematic analysis
 */
export function generateConcepts(text) {
	if (!text || typeof text !== 'string') return [];

	const concepts = new Set();
	const doc = nlp(text);

	// Add topics from NLP
	const topics = doc.topics().out('array');
	topics.forEach((topic) => {
		if (topic.length > 2) {
			concepts.add(topic.toLowerCase());
		}
	});

	// Add keywords
	const keywords = extractKeywords(text, 3);
	keywords.forEach((keyword) => concepts.add(keyword));

	// Add main nouns
	const nouns = doc.nouns().out('array');
	nouns.slice(0, 3).forEach((noun) => {
		if (noun.length > 2) {
			concepts.add(noun.toLowerCase());
		}
	});

	// Add verbs (actions)
	const verbs = doc.verbs().out('array');
	verbs.slice(0, 2).forEach((verb) => {
		if (verb.length > 3) {
			concepts.add(verb.toLowerCase());
		}
	});

	return Array.from(concepts).slice(0, 10); // Limit to 10 concepts
}

/**
 * Complete message analysis
 * Returns all NLP metadata for a message
 */
export function analyzeMessage(text, context = {}) {
	if (!text || typeof text !== 'string') {
		return {
			entities: [],
			concepts: [],
			importance: 50,
			sentiment: 'neutral',
			keywords: [],
			processingVersion: '1.0',
		};
	}

	return {
		entities: extractEntities(text),
		concepts: generateConcepts(text),
		importance: calculateImportance(text, context),
		sentiment: analyzeSentiment(text),
		keywords: extractKeywords(text),
		processingVersion: '1.0',
	};
}

/**
 * Calculate semantic similarity between two texts (0-1)
 * Uses simple Jaccard similarity on concepts
 */
export function calculateSimilarity(text1, text2) {
	if (!text1 || !text2) return 0;

	const concepts1 = new Set(generateConcepts(text1));
	const concepts2 = new Set(generateConcepts(text2));

	// Jaccard similarity
	const intersection = new Set([...concepts1].filter((x) => concepts2.has(x)));
	const union = new Set([...concepts1, ...concepts2]);

	if (union.size === 0) return 0;
	return intersection.size / union.size;
}
