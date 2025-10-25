import { Request, Response, NextFunction } from "express";
import User from "../models/user-model.js";
import { ChatSession, ChatMessage } from "../models/chat-model.js";
import mongoose from "mongoose";
import { Configuration, OpenAIApi } from "openai";
import { configureOpenAI } from "../configs/open-ai-config.js";

/**
 * Generate a chat completion using OpenAI and save to user
 */
export const generateChatCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message } = req.body;
    const userId = res.locals.jwtData?.id;

    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not registered" });

    // Ensure chats array exists (DocumentArray)
    if (!user.chats) user.chats = new mongoose.Types.DocumentArray([]);

    // Push user message first (persists even if API call fails)
    const userMessage = { role: "user", content: message };
    user.chats.push(userMessage as any);

    // Map chats to messages for OpenAI
    const messages = user.chats.map((c: any) => ({ role: c.role, content: c.content }));

    // Configure OpenAI client
    const config = configureOpenAI();
    const openai = new OpenAIApi(config as any);
    const model = process.env.OPENAI_MODEL || process.env.OPEN_AI_MODEL || "gpt-3.5-turbo";

    let assistantContent: string | undefined;
    try {
  const completion = await openai.createChatCompletion({ model, messages });
  assistantContent = (completion?.data?.choices?.[0]?.message?.content ?? "").trim();
    } catch (err: any) {
      console.error("OpenAI API call failed:", err?.response?.data ?? err?.message ?? err);
      const status = err?.response?.status;
      if (status === 401) {
        return res.status(500).json({ message: "OpenAI API call failed", cause: "Invalid OpenAI credentials. Check OPEN_AI_SECRET_KEY in .env" });
      }
      return res.status(500).json({ message: "OpenAI API call failed", cause: err?.response?.data ?? err?.message ?? String(err) });
    }

    if (assistantContent) {
      user.chats.push({ role: "assistant", content: assistantContent } as any);
    }

    user.markModified("chats");
    const saved = await user.save();

    return res.status(200).json({ chats: saved.chats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generateChatCompletion error:", err);
    return res.status(500).json({ message: msg });
  }
};

/**
 * Get all chats for the logged-in user
 */
export const getAllChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User doesn't exist" });

    return res.status(200).json({ message: "OK", chats: user.chats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("getAllChats error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

/**
 * Delete all chats for the logged-in user
 */
export const deleteAllChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User doesn't exist" });

    // Clear chats safely
    if (user.chats && user.chats.length > 0) {
      user.chats.splice(0, user.chats.length);
      user.markModified("chats");
      await user.save();
    }

    // Delete all chat sessions for this user
    await ChatSession.deleteMany({ userId });

    return res.status(200).json({ message: "OK", chats: user.chats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("deleteAllChats error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { title } = req.body;
    
    const session = new ChatSession({
      userId,
      title: title || 'New Chat',
      messages: []
    });

    await session.save();
    return res.status(201).json({ message: "Chat session created", session });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("createChatSession error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};
/**
 * Delete a specific chat session by ID
 */
export const deleteChatSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;

    const deletedSession = await ChatSession.findOneAndDelete({ _id: sessionId, userId });
    if (!deletedSession) {
      return res.status(404).json({ message: "Chat session not found or already deleted" });
    }

    return res.status(200).json({ message: "Chat session deleted successfully", sessionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("deleteChatSessionById error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};


/**
 * Get all chat sessions for a user
 */
export const getChatSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt');

    return res.status(200).json({ message: "OK", sessions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("getChatSessions error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

/**
 * Get chat session by ID with messages
 */
export const getChatSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ _id: sessionId, userId });

    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    return res.status(200).json({ message: "OK", session });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("getChatSessionById error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

/**
 * Add a message to a chat session
 */
export const addMessageToChatSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;
    const { message } = req.body;

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    // Add user message
    const userMessage = new ChatMessage({ role: "user", content: message });
    session.messages.push(userMessage);

    // Configure OpenAI client for response
    const config = configureOpenAI();
    const openai = new OpenAIApi(config as any);
    const model = process.env.OPENAI_MODEL || process.env.OPEN_AI_MODEL || "gpt-3.5-turbo";

    // Map messages for OpenAI
    const messages = session.messages.map(m => ({ role: m.role, content: m.content }));

    let assistantContent: string | undefined;
    try {
      const completion = await openai.createChatCompletion({ model, messages });
      assistantContent = (completion?.data?.choices?.[0]?.message?.content ?? "").trim();
    } catch (err: any) {
      console.error("OpenAI API call failed:", err?.response?.data ?? err?.message ?? err);
      const status = err?.response?.status;
      if (status === 401) {
        return res.status(500).json({ message: "OpenAI API call failed", cause: "Invalid OpenAI credentials" });
      }
      return res.status(500).json({ message: "OpenAI API call failed", cause: err?.response?.data ?? err?.message ?? String(err) });
    }

    if (assistantContent) {
      const assistantMessage = new ChatMessage({
        role: "assistant",
        content: assistantContent
      });
      session.messages.push(assistantMessage);
    }

    await session.save();
    return res.status(200).json({ message: "Message added", session });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("addMessageToChatSession error:", err);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};
