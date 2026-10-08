const Anthropic = require('@anthropic-ai/sdk');

/**
 * Service for interacting with Anthropic API (Claude)
 * to provide AI-powered features for Teldock.
 */
class AIService {
  constructor() {
    // Initialize lazily to avoid crashing if env is not set yet
    this.anthropic = null;
  }

  get client() {
    if (!this.anthropic) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
      }
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropic;
  }

  /**
   * Analyzes text content and returns suggested tags and a brief summary.
   * @param {string} textContent The content of the file
   * @param {string} filename The name of the file
   * @returns {Promise<{tags: string[], summary: string}>}
   */
  async analyzeFileContent(textContent, filename) {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Using haiku for speed and cost efficiency for basic tasks
        max_tokens: 1024,
        system: "You are an intelligent file analysis assistant for a cloud storage app. Your task is to analyze the provided text content of a file and return a structured JSON response containing: 1. A short summary (1-2 sentences). 2. An array of 3-5 relevant tags (lowercase, single words if possible). Output ONLY valid JSON, no markdown formatting.",
        messages: [
          {
            role: 'user',
            content: `Filename: ${filename}\n\nContent:\n${textContent}`
          }
        ],
        temperature: 0.2,
      });

      const resultText = response.content[0].text;
      try {
        const jsonResult = JSON.parse(resultText);
        return {
          summary: jsonResult.summary || '',
          tags: Array.isArray(jsonResult.tags) ? jsonResult.tags : []
        };
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', resultText);
        return { summary: '', tags: [] };
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
