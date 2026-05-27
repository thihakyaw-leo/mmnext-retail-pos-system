import { Context } from 'hono';
import { Bindings } from '../types/env.js';
import { GoogleGenAI, Type } from '@google/genai';

export class AIController {
  
  /**
   * Smart Search
   * Takes a natural language query and converts it to a structured JSON object
   * to query the database intelligently.
   */
  async smartSearch(c: Context<Bindings>) {
    try {
      const { query } = await c.req.json();
      
      if (!query) {
        return c.json({ error: 'Query is required' }, 400);
      }

      if (!c.env.GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return c.json({ error: 'AI service is temporarily unavailable.' }, 503);
      }

      // Initialize Gemini SDK
      const ai = new GoogleGenAI({ apiKey: c.env.GEMINI_API_KEY });
      
      // Define the expected output schema
      const searchSchema = {
        type: Type.OBJECT,
        properties: {
          category: { 
            type: Type.STRING, 
            description: "The product category, e.g., 'shirt', 'pants', 'laptop', 'food'" 
          },
          color: { 
            type: Type.STRING, 
            description: "The color mentioned, e.g., 'red', 'blue'" 
          },
          max_price: { 
            type: Type.NUMBER, 
            description: "The maximum price the user is willing to pay" 
          },
          min_price: { 
            type: Type.NUMBER, 
            description: "The minimum price the user is willing to pay" 
          },
          keywords: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Any other important keywords or adjectives like 'summer', 'cotton', 'vintage'" 
          }
        }
      };

      // Call Gemini 2.5 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `Extract the search parameters from this query: "${query}"` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: searchSchema,
          temperature: 0.1, // Keep it deterministic
        }
      });

      const parsedQuery = response.text ? JSON.parse(response.text) : {};

      // In a real application, we would take `parsedQuery` and construct a D1 SQL Query:
      // let sql = "SELECT * FROM products WHERE 1=1";
      // if (parsedQuery.color) sql += " AND attributes LIKE '%" + parsedQuery.color + "%'";
      // ... etc ...
      // For now, we will just return the parsed JSON to demonstrate the capability.

      return c.json({
        success: true,
        original_query: query,
        extracted_parameters: parsedQuery,
        message: 'Query parsed successfully using Gemini API'
      });

    } catch (error: any) {
      console.error('Smart Search Error:', error);
      return c.json({ 
        error: 'Failed to process AI search', 
        details: c.env.ENVIRONMENT === 'development' ? error.message : undefined
      }, 500);
    }
  }
}
