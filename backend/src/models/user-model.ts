import mongoose, { Schema, Document, Types } from "mongoose";
import chatSchema, { IChatMessage } from "./chat-model.js";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  chats: Types.DocumentArray<IChatMessage>;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chats: [chatSchema],
});

export default mongoose.model<IUser>("User", userSchema);
