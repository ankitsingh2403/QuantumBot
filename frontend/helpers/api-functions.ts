import axios from "axios";

// Normalize VITE_API_BASE_URL to handle values like ":5001/api" (which would cause requests to go to 
// ":5001/..." and fail). If the env var is set but starts with ':' we'll prefix with http://localhost.
const rawBase = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = (() => {
  if (!rawBase) return "http://localhost:5001/api";
  // If user supplied something like ":5001" or ":5001/api"
  if (rawBase.startsWith(":")) return `http://localhost${rawBase}`;
  // If they supplied just a port number like "5001" (unlikely) prefix
  if (/^\d+$/.test(rawBase)) return `http://localhost:${rawBase}/api`;
  return rawBase;
})();

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ✅ Ensures cookies/sessions are sent
});

// ✅ Unified error handler
const handleAxiosError = (err: any, customMessage: string) => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      err.message ||
      "Something went wrong.";

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

// ✅ LOGIN
export const userLogin = async (email: string, password: string) => {
  try {
    const response = await api.post(`/user/login`, { email, password });
    if (response.status !== 200) {
      throw new Error("Login failed.");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error! Cannot Login.");
  }
};

// ✅ SIGNUP
export const userSignup = async (
  name: string,
  email: string,
  password: string
) => {
  try {
    const response = await api.post(`/user/signup`, {
      name,
      email,
      password,
    });
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error! Cannot Signup.");
  }
};

// ✅ AUTH STATUS
export const getAuthStatus = async () => {
  try {
    const response = await api.get(`/user/auth-status`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (response.status !== 200) {
      throw new Error("Could not verify authentication status");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error checking authentication status.");
  }
};

// ✅ NEW CHAT
export const postChatRequest = async (message: string) => {
  try {
    const response = await api.post(`/chat/new`, { message });
    if (response.status !== 200) {
      throw new Error("Chat request failed.");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error sending chat request.");
  }
};

// ✅ FETCH ALL CHATS
export const getAllChats = async () => {
  try {
    const response = await api.get(`/chat/all-chats`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (response.status !== 200) {
      throw new Error("Failed to get chats.");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error fetching chats.");
  }
};

// ✅ DELETE ALL CHATS
export const deleteAllChats = async () => {
  try {
    const response = await api.delete(`/chat/delete-all-chats`);
    if (response.status !== 200) {
      throw new Error("Failed to delete chats.");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error deleting chats.");
  }
};

// ✅ LOGOUT
export const logoutUser = async () => {
  try {
    const response = await api.get(`/user/logout`);
    if (response.status !== 200) {
      throw new Error("Logout failed.");
    }
    return response.data;
  } catch (err: any) {
    handleAxiosError(err, "Error logging out user.");
  }
};
