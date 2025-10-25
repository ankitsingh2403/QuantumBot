import express from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatCompletionValidator, validate } from "../utils/validators.js";
import { 
    deleteAllChats, 
    generateChatCompletion, 
    getAllChats, 
    createChatSession,
    getChatSessions,
    getChatSessionById,
    addMessageToChatSession,
    deleteChatSessionById // make sure to import this
} from "../controllers/chat-controllers.js";

const chatRoutes = express.Router();

// test
chatRoutes.get("/", (req, res) => {
	console.log("hi");
	res.send("hello from chatRoutes");
});

// protected API
chatRoutes.post(
	"/new",
	validate(chatCompletionValidator),
	verifyToken,
	generateChatCompletion
);

chatRoutes.get(
	"/all-chats",
	verifyToken,
	getAllChats
);

// Chat Sessions
chatRoutes.post(
    "/sessions",
    verifyToken,
    createChatSession
);

chatRoutes.get(
    "/sessions",
    verifyToken,
    getChatSessions
);

chatRoutes.get(
    "/sessions/:sessionId",
    verifyToken,
    getChatSessionById
);

chatRoutes.post(
    "/sessions/:sessionId/messages",
    validate(chatCompletionValidator),
    verifyToken,
    addMessageToChatSession
);

chatRoutes.delete(
    "/delete-all-chats",
    verifyToken,
    deleteAllChats
);

// DELETE single chat session
chatRoutes.delete(
    "/sessions/:sessionId",
    verifyToken,
    deleteChatSessionById
);

export default chatRoutes;
