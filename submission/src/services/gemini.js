import { GoogleGenAI } from '@google/genai';

// Global instance to reuse once initialized
let ai = null;

/**
 * Communicates with the Gemini model to provide election education insights.
 * @param {string} query - The user's question.
 * @param {string} knowledgeLevel - Beginner, Intermediate, or Advanced.
 * @returns {Promise<string>} The formulated educational response.
 */
export const getElectionInsight = async (query, knowledgeLevel = 'Beginner') => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env file to use the AI Copilot.');
  }

  if (!ai) {
    ai = new GoogleGenAI({});
  }

  const systemInstruction = `
You are the Election Education Skill assistant.
Your Purpose: Help users understand election processes, timelines, and civic procedures in a clear, neutral, interactive, and engaging way.

Core Principles:
1. Strict Political Neutrality.
2. Adapt to the User's Knowledge Level (the user is: ${knowledgeLevel}).
3. Interactive & Structured Delivery (use timelines, lists, markdown).

If the user asks a contested topic, present BOTH sides without taking a position.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [query],
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 800,
      }
    });

    return response.text;
  } catch (error) {
    console.error('Error fetching insight from Gemini API:', error);
    throw new Error('Failed to fetch election insight from Google Services.');
  }
};
