import express from "express";
import { askConversation } from "../controllers/ai.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/ask-conversation/:userId", protectRoute, askConversation);

export default router;