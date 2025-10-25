import axios from "axios";

// Normalize VITE_API_BASE_URL similar to api-functions so frontend doesn't try to request 
// to ":5001/..." which results in ERR_CONNECTION_REFUSED in the browser.
const rawBase = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = (() => {
  if (!rawBase) return "http://localhost:5001/api";
  if (rawBase.startsWith(":")) return `http://localhost${rawBase}`;
  if (/^\d+$/.test(rawBase)) return `http://localhost:${rawBase}/api`;
  return rawBase;
})();

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Centralized Axios error handler
const handleAxiosError = (err: any, customMessage: string) => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message || "Something went wrong.";

    if (status === 401) {
      console.warn("⚠️ Unauthorized: User not authenticated.");
    } else {
      console.error(`❌ API Error (${status}): ${message}`);
    }

    throw new Error(`${customMessage} ${message}`);
  } else {
    console.error("❌ Unexpected Error:", err);
    throw new Error(`${customMessage} ${err.message || err}`);
  }
};

// Create a new chat session
export const createChatSession = async (title?: string) => {
  try {
    const response = await api.post("/chat/sessions", { title });
    return response.data;
  } catch (err) {
    handleAxiosError(err, "Failed to create chat session:");
  }
};

// Get all chat sessions
export const getChatSessions = async () => {
  try {
    const response = await api.get("/chat/sessions");
    return response.data;
  } catch (err) {
    handleAxiosError(err, "Failed to fetch chat sessions:");
  }
};

// Get a single chat session by ID
export const getChatSessionById = async (sessionId: string) => {
  try {
    const response = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  } catch (err) {
    handleAxiosError(err, "Failed to fetch chat session:");
  }
};

// Send a message to a specific chat session
export const sendMessageToChatSession = async (sessionId: string, message: string) => {
  try {
    const response = await api.post(`/chat/sessions/${sessionId}/messages`, { message });
    return response.data;
  } catch (err) {
    handleAxiosError(err, "Failed to send message:");
  }
};

// Delete a chat session by ID
export const deleteChatSession = async (sessionId: string) => {
  try {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  } catch (err) {
    handleAxiosError(err, "Failed to delete chat session:");
  }
};

