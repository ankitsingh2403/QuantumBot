import jwt, { Secret, JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// Ensure JWT_SECRET exists at runtime
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in your environment variables!");
}

const JWT_SECRET: Secret = process.env.JWT_SECRET;

// Create a JWT token
export const createToken = (id: string, email: string, expiresIn: string) => {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn });
};

// Low-level verifier: returns decoded payload or throws
export const verifyTokenPayload = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }
    return decoded as JwtPayload;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`JWT verification failed: ${msg}`);
  }
};

// Express middleware: reads token from signed cookie or Authorization header,
// verifies it and attaches payload to res.locals.jwtData
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try signed cookies first (cookie-parser with secret should be configured)
    const cookieName = process.env.COOKIE_NAME || "auth_token";
    const tokenFromCookie = req.signedCookies?.[cookieName] ?? req.cookies?.[cookieName];

    // Or fallback to Authorization header
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

    const token = tokenFromCookie || tokenFromHeader;
    if (!token) {
      return res.status(401).json({ message: "ERROR", cause: "No authentication token provided" });
    }

    const payload = verifyTokenPayload(token);
    // Attach payload to res.locals for downstream handlers
    res.locals.jwtData = payload;
    return next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Token verification middleware error:", msg);
    return res.status(401).json({ message: "ERROR", cause: msg });
  }
};
