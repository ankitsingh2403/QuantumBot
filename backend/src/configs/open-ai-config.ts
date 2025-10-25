import dotenv from "dotenv";
import { Configuration } from "openai";

// Load .env variables
dotenv.config();

export const configureOpenAI = () => {
    const config = new Configuration({
        apiKey: process.env.OPEN_AI_SECRET_KEY,
        organization: process.env.OPEN_AI_ORG,
    });

    return config;
};
