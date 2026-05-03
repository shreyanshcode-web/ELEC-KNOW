import { GoogleGenAI } from '@google/genai';
import logger from '../config/logger.js';

/**
 * Gemini AI service for Election Process Education.
 * Generates adaptive, interactive explanations about election processes,
 * timelines, and civic procedures using Google's Gemini model.
 *
 * Problem Statement Alignment:
 * "Create an assistant that helps users understand the election process,
 *  timelines, and steps in an interactive and easy-to-follow way."
 *
 * @module services/gemini
 */

/** @type {GoogleGenAI|null} Singleton AI client instance */
let ai = null;

/**
 * Generates an educational, interactive response about the election process.
 * Adapts depth and vocabulary to the user's knowledge level.
 *
 * @param {string} query - The user's question about the election process.
 * @param {string} [knowledgeLevel='Beginner'] - Beginner, Intermediate, or Advanced.
 * @returns {Promise<string>} A structured, educational response with timelines and steps.
 * @throws {Error} If GEMINI_API_KEY is not configured or Gemini API call fails.
 */
export const getElectionInsight = async (query, knowledgeLevel = 'Beginner') => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it to Google Secret Manager as "gemini-api-key", or set it in .env for local development.'
    );
  }

  if (!ai) {
    ai = new GoogleGenAI({});
  }

  const systemInstruction = `
You are the **Election Process Education Assistant** — a friendly, neutral, and knowledgeable guide 
that helps citizens understand the election process, timelines, and steps in an interactive and easy-to-follow way.

## Core Mission
Help users understand:
- **The Election Process**: Registration, nomination, campaigning, polling, counting, and results.
- **Timelines**: Key dates, phases, and deadlines in the electoral calendar.
- **Steps**: What voters need to do before, during, and after election day.

## Knowledge Level Adaptation
The user's current level is: **${knowledgeLevel}**
- Beginner: Use simple language, analogies, numbered steps, and emojis for engagement.
- Intermediate: Add context about legal frameworks (RPA 1950/51), ECI's role, and cross-state comparisons.
- Advanced: Include constitutional articles, judicial precedents, and statistical analysis.

## Response Guidelines
1. **Strict Political Neutrality** — never endorse any party, candidate, or ideology.
2. **Interactive & Structured** — use numbered steps, bullet points, timelines, tables, and markdown.
3. **Source Attribution** — cite official sources (ECI, Constitution of India, data.gov.in) when possible.
4. **Visual Cues** — use emojis (📋, 🗳️, 📅, ✅) to make steps easy to scan.
5. **Actionable Steps** — always tell the user what they can DO next (check voter roll, find booth, etc.).

If the user asks about a contested political topic, present BOTH sides factually without taking any position.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [query],
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 1200,
      },
    });

    return response.text;
  } catch (error) {
    logger.error('Gemini API call failed', { error: error.message, query: query.substring(0, 80) });
    throw new Error('Failed to generate election education insight from Google Gemini.');
  }
};
