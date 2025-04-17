import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { createClient } from "redis";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

const redisClient = createClient({
  username: process.env.REDIS_UNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
})();

const otpRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "otp_rate_limit",
  points: 3, // 3 OTP requests
  duration: 5 * 60,
  blockDuration: 5 * 60,
});

const rateLimiter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return next();
    }

    try {
      await otpRateLimiter.consume(mobileNumber);
      next();
    } catch (error) {
      throw new ApiError(429, "Too many OTP requests. Please try again later.");
    }
  }
);

export { rateLimiter };
