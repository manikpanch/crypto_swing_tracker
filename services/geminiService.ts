
import { GoogleGenAI, Type } from "@google/genai";
import { PricePoint } from "../types";

export const fetchTickerHistory = async (ticker: string, year: number): Promise<PricePoint[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isCurrentYear = year === new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0];

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
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
