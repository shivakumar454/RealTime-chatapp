import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    // model: "gemini-3.8-flash-lite",
    //  model: "gemini-2.5-flash-lite",
    contents: prompt,
});

console.log(response.text);