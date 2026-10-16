import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const askConversation = async (req, res) => {
  try {
    const { question } = req.body;
    const { userId: selectedUserId } = req.params;
    const currentUserId = req.user._id;

    console.log("Current user:", currentUserId);
    console.log("Selected user:", selectedUserId);
    console.log("Question:", question);

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    if (!mongoose.isValidObjectId(selectedUserId)) {
      return res.status(400).json({
        message: "Invalid selected user ID",
      });
    }

    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: question.trim(),
    });

    const queryVector = embeddingResponse.embeddings[0].values;

    console.log("Question embedding generated:", queryVector.length);

    const results = await mongoose.connection.db
      .collection("messages")
      .aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector,
            numCandidates: 10,
            limit: 5,
            filter: {
              $or: [
                {
                  $and: [
                    {
                      senderId: new mongoose.Types.ObjectId(
                        currentUserId
                      ),
                    },
                    {
                      receiverId: new mongoose.Types.ObjectId(
                        selectedUserId
                      ),
                    },
                  ],
                },
                {
                  $and: [
                    {
                      senderId: new mongoose.Types.ObjectId(
                        selectedUserId
                      ),
                    },
                    {
                      receiverId: new mongoose.Types.ObjectId(
                        currentUserId
                      ),
                    },
                  ],
                },
              ],
            },
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

    console.log("Retrieved messages:", results);

    if (results.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find anything relevant in this conversation.",
        sources: [],
        foundContext:false,
      });
    }

    // Keep only messages above the initial relevance threshold
    const relevantResults = results.filter(
      (message) =>
        typeof message.text === "string" &&
        message.text.trim() !== "" &&
        message.score >= 0.80
    );

    console.log("Relevant messages:", relevantResults);

    if (relevantResults.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find anything relevant in this conversation.",
        sources: [],
        foundContext:false,
      });
    }

    const context = relevantResults
      .map((message) => message.text)
      .join("\n");

    console.log("Conversation context:", context);

    const prompt = `
You are an assistant that answers questions about a private chat conversation.

Use only the conversation context provided below.
Do not invent facts or assume information that is not present.
If the context does not contain enough information to answer, say so clearly.

Conversation context:
${context}

User question:
${question.trim()}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const answer = response.text;

    if (!answer) {
      throw new Error("Gemini returned an empty answer");
    }

    const sources = relevantResults.map((message) => ({
      messageId: message._id,
      text: message.text,
      score: message.score,
    }));

    console.log("AI Answer:", answer);
    console.log("Sources:", sources);

    return res.status(200).json({
      answer,
      sources,
      foundContext:true,
    });
  } catch (error) {
    console.error("Error in askConversation:", error.message);

    if (
      error.status === 503 ||
      error.code === 503
    ) {
      return res.status(503).json({
        message: "The AI service is temporarily busy. Please try again shortly.",
      });
    }

    return res.status(500).json({
      message: "Failed to process your question.",
    });
  }
};
