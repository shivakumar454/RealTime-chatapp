import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const currentUserId = process.env.TEST_CURRENT_USER_ID;
const selectedUserId = process.env.TEST_SELECTED_USER_ID;

if (
  !process.env.GEMINI_API_KEY ||
  !process.env.MONGODB_URI
) {
  throw new Error(
    "GEMINI_API_KEY and MONGODB_URI must be configured in backend/.env"
  );
}

if (
  !mongoose.isValidObjectId(currentUserId) ||
  !mongoose.isValidObjectId(selectedUserId)
) {
  throw new Error(
    "Set valid TEST_CURRENT_USER_ID and TEST_SELECTED_USER_ID values in backend/.env"
  );
}

try {
  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
  });

  console.log("MongoDB connected");

  const question = "What was I testing?";

  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: question,
  });

  const queryVector = embeddingResponse.embeddings[0].values;

  console.log("Question embedding generated:", queryVector.length);

  const currentId = new mongoose.Types.ObjectId(currentUserId);
  const selectedId = new mongoose.Types.ObjectId(selectedUserId);

  const results = await mongoose.connection.db
    .collection("messages")
    .aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 10,
          limit: 3,
          filter: {
            $or: [
              {
                $and: [
                  { senderId: currentId },
                  { receiverId: selectedId },
                ],
              },
              {
                $and: [
                  { senderId: selectedId },
                  { receiverId: currentId },
                ],
              },
            ],
          },
        },
      },
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

  const context = results
    .map((message) => message.text)
    .filter(Boolean)
    .join("\n");

  if (!context) {
    console.log("No messages found for this conversation.");
    process.exitCode = 0;
  } else {
    const prompt = `
Answer the user's question using only the provided conversation context.
Do not invent information that is not present.

Conversation context:
${context}

User question:
${question}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    console.log("\nAI Answer:");
    console.log(response.text);
  }
} catch (error) {
  console.error("RAG test failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}
