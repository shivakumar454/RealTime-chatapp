import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: "I am learning React and Node.js",
});

console.log(response.embeddings[0].values);