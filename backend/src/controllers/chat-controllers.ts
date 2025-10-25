// src/controllers/chat-controllers.ts
import { Request, Response } from "express";
import User from "../models/user-model.js";
import { ChatSession, ChatMessage } from "../models/chat-model.js";
import mongoose from "mongoose";
import { OpenAIApi } from "openai";
import { configureOpenAI } from "../configs/open-ai-config.js";

/**
 * Generate a chat completion using OpenAI and save to user's chat history
 */
export const generateChatCompletion = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not registered" });

    if (!user.chats) user.chats = new mongoose.Types.DocumentArray([]);

    user.chats.push({ role: "user", content: message } as any);

    const messages = user.chats.map(c => ({ role: c.role, content: c.content }));
    const openai = new OpenAIApi(configureOpenAI() as any);
    const model = process.env.OPENAI_MODEL || process.env.OPEN_AI_MODEL || "gpt-3.5-turbo";

    let assistantContent: string | undefined;
    try {
      const completion = await openai.createChatCompletion({ model, messages });
      assistantContent = completion?.data?.choices?.[0]?.message?.content?.trim() || "";
    } catch (err: any) {
      console.error("OpenAI API call failed:", err?.response?.data ?? err?.message ?? err);
      return res.status(500).json({
        message: "OpenAI API call failed",
        cause: err?.response?.status === 401
          ? "Invalid OpenAI credentials"
          : err?.response?.data ?? err?.message ?? String(err)
      });
    }

    if (assistantContent) user.chats.push({ role: "assistant", content: assistantContent } as any);

    user.markModified("chats");
    await user.save();

    return res.status(200).json({ chats: user.chats });
  } catch (err: unknown) {
    console.error("generateChatCompletion error:", err);
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Get all chats for the logged-in user
 */
export const getAllChats = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User doesn't exist" });

    return res.status(200).json({ message: "OK", chats: user.chats });
  } catch (err: unknown) {
    console.error("getAllChats error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Delete all chats for the logged-in user
 */
export const deleteAllChats = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User doesn't exist" });

    if (user.chats?.length) {
      user.chats.splice(0, user.chats.length);
      user.markModified("chats");
      await user.save();
    }

    await ChatSession.deleteMany({ userId });

    return res.status(200).json({ message: "OK", chats: user.chats });
  } catch (err: unknown) {
    console.error("deleteAllChats error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { title } = req.body;
    const session = new ChatSession({ userId, title: title || "New Chat", messages: [] });

    await session.save();
    return res.status(201).json({ message: "Chat session created", session });
  } catch (err: unknown) {
    console.error("createChatSession error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Delete a specific chat session by ID
 */
export const deleteChatSessionById = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;
    const deletedSession = await ChatSession.findOneAndDelete({ _id: sessionId, userId });

    if (!deletedSession) return res.status(404).json({ message: "Chat session not found or already deleted" });

    return res.status(200).json({ message: "Chat session deleted successfully", sessionId });
  } catch (err: unknown) {
    console.error("deleteChatSessionById error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Get all chat sessions for a user
 */
export const getChatSessions = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const sessions = await ChatSession.find({ userId })
      .sort({ updatedAt: -1 })
      .select("title createdAt updatedAt");

    return res.status(200).json({ message: "OK", sessions });
  } catch (err: unknown) {
    console.error("getChatSessions error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Get chat session by ID with messages
 */
export const getChatSessionById = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ message: "Chat session not found" });

    return res.status(200).json({ message: "OK", session });
  } catch (err: unknown) {
    console.error("getChatSessionById error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};

/**
 * Add a message to a chat session
 */
export const addMessageToChatSession = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "Token missing or invalid" });

    const { sessionId } = req.params;
    const { message } = req.body;

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ message: "Chat session not found" });

    session.messages.push(new ChatMessage({ role: "user", content: message }));

    const openai = new OpenAIApi(configureOpenAI() as any);
    const model = process.env.OPENAI_MODEL || process.env.OPEN_AI_MODEL || "gpt-3.5-turbo";
    const messages = session.messages.map(m => ({ role: m.role, content: m.content }));

    let assistantContent: string | undefined;
    try {
      const completion = await openai.createChatCompletion({ model, messages });
      assistantContent = completion?.data?.choices?.[0]?.message?.content?.trim() || "";
    } catch (err: any) {
      console.error("OpenAI API call failed:", err?.response?.data ?? err?.message ?? err);
      return res.status(500).json({
        message: "OpenAI API call failed",
        cause: err?.response?.status === 401
          ? "Invalid OpenAI credentials"
          : err?.response?.data ?? err?.message ?? String(err)
      });
    }

    if (assistantContent) session.messages.push(new ChatMessage({ role: "assistant", content: assistantContent }));

    await session.save();
    return res.status(200).json({ message: "Message added", session });
  } catch (err: unknown) {
    console.error("addMessageToChatSession error:", err);
    return res.status(500).json({ message: "ERROR", cause: err instanceof Error ? err.message : String(err) });
  }
};
