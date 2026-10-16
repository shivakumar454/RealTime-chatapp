import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
});

console.log("MongoDB connected");

const question = "What was I testing?";

// 1. Create embedding for the question
const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: question,
});

const queryVector = embeddingResponse.embeddings[0].values;

// 2. Find relevant messages
const results = await mongoose.connection.db
    .collection("messages")
    .aggregate([
        {$vectorSearch:{
  index:"vector_index",
  path:"embedding",
  queryVector,
  numCandidates:10,
  limit:3,
  filter:{
    $or:[
      {
        $and:[
          {senderId:new mongoose.Types.ObjectId("6ab730ddfe2737c4d204a2f8")},
          {receiverId:new mongoose.Types.ObjectId("6ab73121fe2737c4d204a2fd")}
        ]
      },
      {
        $and:[
          {senderId:new mongoose.Types.ObjectId("6ab73121fe2737c4d204a2fd")},
          {receiverId:new mongoose.Types.ObjectId("6ab730ddfe2737c4d204a2f8")}
        ]
      }
    ]
  }
}},
        {
            $project: {
                text: 1,
                score: {
                    $meta: "vectorSearchScore",
                },
            },
        },
    ])
    .toArray();

console.log("Retrieved messages:", results);

// 3. Build context
const context = results
    .map((message) => message.text)
    .join("\n");

// 4. Ask Gemini using the retrieved context
const prompt = `
Answer the user's question using only the provided conversation context.

Conversation context:
${context}

User question:
${question}
`;

const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
});

console.log("\nAI Answer:");
console.log(response.text);

await mongoose.disconnect();