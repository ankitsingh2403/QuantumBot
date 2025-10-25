import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for individual chat messages - used both in sessions and legacy chat arrays
const chatMessageSchema = new Schema<IChatMessage>({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// For backward compatibility - this is the schema used in user.chats array
const chatSchema = chatMessageSchema;
export default chatSchema;

// New schema for chat sessions
const chatSessionSchema = new Schema<IChatSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    default: 'New Chat',
  },
  messages: [chatMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt timestamp before saving
chatSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Models
export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);

// Export schemas for use in other models
export { chatMessageSchema };
