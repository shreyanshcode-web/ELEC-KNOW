import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client using the Vertex AI / GenAI Google SDK
const ai = new GoogleGenAI({});

/**
 * Communicates with the Gemini model to provide election education insights.
 * @param {string} query - The user's question.
 * @param {string} knowledgeLevel - Beginner, Intermediate, or Advanced.
 * @returns {Promise<string>} The formulated educational response.
 */
export const getElectionInsight = async (query, knowledgeLevel = 'Beginner') => {
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
