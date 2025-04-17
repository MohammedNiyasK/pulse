import { Router } from "express";
import {
  generateOtp,
  verifyOtp,
  resendOtp,
} from "../controllers/otp.controller";
import { rateLimiter } from "../middlewares/rateLimiter";

const router = Router();

router.route("/generate-otp").post(rateLimiter, generateOtp);
router.route("/verify-otp").post(verifyOtp);
router.route("/resend-otp").post(rateLimiter, resendOtp);

export default router;
