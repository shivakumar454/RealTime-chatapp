import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

await mongoose.connect(process.env.MONGODB_URI);

console.log("MongoDB connected");

const question = "What am I testing?";

const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: question,
});

const queryVector = embeddingResponse.embeddings[0].values;

const results = await mongoose.connection.db
    .collection("messages")
    .aggregate([
        {
            $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: queryVector,
                numCandidates: 10,
                limit: 3,
            },
        },
        {
            $project: {
                text: 1,
                senderId: 1,
                receiverId: 1,
                score: {
                    $meta: "vectorSearchScore",
                },
            },
        },
    ])
    .toArray();

console.log("Vector Search Results:");
console.log(results);   

await mongoose.disconnect();