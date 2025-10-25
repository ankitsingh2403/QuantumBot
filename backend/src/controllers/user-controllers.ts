// src/controllers/user-controllers.ts
import { Request, Response, NextFunction } from "express";
import { hash, compare } from "bcrypt";
import User from "../models/user-model.js";
import { createToken } from "../utils/token-manager.js";
import { COOKIE_NAME } from "../utils/constants.js";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const isProd = process.env.NODE_ENV === "production";

const getCookieOptions = () => {
  let domain: string | undefined = undefined;
  if (isProd && process.env.DOMAIN) {
    try {
      const url = new URL(process.env.DOMAIN);
      domain = url.hostname;
    } catch {
      domain = process.env.DOMAIN;
    }
  }

  return {
    httpOnly: true,
    signed: true,
    secure: isProd,
    sameSite: isProd ? ("strict" as const) : ("lax" as const),
    ...(domain ? { domain } : {}),
    maxAge: COOKIE_MAX_AGE,
  };
};

// ---------------------- CONTROLLERS ----------------------

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find();
    return res.status(200).json({ message: "OK", users });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("getAllUsers error:", error);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

export const userSignUp = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "ERROR", cause: "User already exists" });
    }

    const hashedPassword = await hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = createToken(user._id.toString(), user.email, "7d");
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(201).json({ message: "OK", name: user.name, email: user.email });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("userSignUp error:", error);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

export const userLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "ERROR", cause: "User not found" });
    }

    const isPasswordCorrect = await compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(403).json({ message: "ERROR", cause: "Incorrect password" });
    }

    const token = createToken(user._id.toString(), user.email, "7d");
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    return res.status(200).json({ message: "OK", name: user.name, email: user.email });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("userLogin error:", error);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

export const verifyUserStatus = async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.jwtData?.id;
    if (!userId) return res.status(401).json({ message: "ERROR", cause: "Invalid token" });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "ERROR", cause: "User not found" });

    return res.status(200).json({ message: "OK", name: user.name, email: user.email });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("verifyUserStatus error:", error);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};

export const logoutUser = (_req: Request, res: Response) => {
  try {
    res.clearCookie(COOKIE_NAME, getCookieOptions());
    return res.status(200).json({ message: "OK" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("logoutUser error:", error);
    return res.status(500).json({ message: "ERROR", cause: msg });
  }
};
