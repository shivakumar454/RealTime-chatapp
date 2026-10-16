import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiveSocketId, io } from "../lib/socket.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export const getUserForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;

        const filteredUsers = await User.find({
            _id: { $ne: loggedInUserId }
        }).select("-password");

        res.status(200).json(filteredUsers);

    } catch (error) {
        console.error("Error in getUsersForSidebar:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id: usertoChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: usertoChatId },
                { senderId: usertoChatId, receiverId: myId }
            ]
        });

        res.status(200).json(messages);

    } catch (error) {
        console.log("Error in getMessages controller :", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        console.log("🔥 sendMessage controller called");
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;
        let embedding;

        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        if (text) {
            const embeddingResponse = await ai.models.embedContent({
                model: "gemini-embedding-2",
                contents: text,
            });

            embedding = embeddingResponse.embeddings[0].values;
            console.log("Embedding generated:", embedding?.length);
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            embedding,
        });

        await newMessage.save();

        const receiverSocketId = getReceiveSocketId(receiverId);

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.log("Error in sendMessage controller :", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};