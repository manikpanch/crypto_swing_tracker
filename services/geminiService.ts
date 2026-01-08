
import { GoogleGenAI, Type } from "@google/genai";
import { PricePoint, MovementEvent } from "../types";

export const fetchTickerHistory = async (ticker: string, year: number): Promise<PricePoint[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isCurrentYear = year === new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Provide actual historical daily closing prices for the asset "${ticker}" for the year ${year}. 
    ${isCurrentYear ? `Since it is the current year, provide data from January 1st up to ${currentDate}.` : `Provide data for the full year.`}
    Prices must be at 00:00 ET (Daily Close). 
    Return the data as a JSON array of objects with "date" (YYYY-MM-DD) and "price" (number). 
    Use your search tool to ensure the prices are accurate historical records for this specific ticker.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: 'ISO date YYYY-MM-DD' },
            price: { type: Type.NUMBER, description: 'Closing price at 00:00 ET' }
          },
          required: ["date", "price"]
        }
      }
    }
  });

  try {
    const text = response.text || '[]';
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid data format received");
    
    return data
      .filter(item => item.date && item.price)
      .sort((a: PricePoint, b: PricePoint) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error(`Failed to fetch accurate historical data for ${ticker}. Please try again.`);
  }
};

/**
 * Fetches context for a SINGLE movement event. 
 * Strictly limits the summary to 50 words or fewer.
 */
export const fetchSingleMovementContext = async (ticker: string, move: MovementEvent): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Research and explain why the price of ${ticker} moved ${move.type} by ${Math.abs(move.percentageChange).toFixed(2)}% between ${move.startDate} and ${move.endDate}.
  The price went from $${move.startPrice.toLocaleString()} to $${move.endPrice.toLocaleString()}.
  Identify specific macro or micro events (news, Fed decisions, hacks, ETF flows) that directly contributed to this ${move.type} movement.
  
  STRICT INSTRUCTION: Provide a concise summary of NO MORE THAN 50 WORDS. Do not use filler phrases. Focus solely on causes for the ${move.type} direction.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a concise financial analyst. Your responses MUST NEVER exceed 50 words. Be direct and strictly focused on the requested price direction."
    }
  });

  try {
    let result = response.text?.trim() || "No specific event data identified for this movement.";
    
    // Safety check: force truncation if the model ignores instructions
    const words = result.split(/\s+/);
    if (words.length > 50) {
        return words.slice(0, 50).join(' ') + '...';
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching individual context:", error);
    return "Event research failed for this period.";
  }
};
