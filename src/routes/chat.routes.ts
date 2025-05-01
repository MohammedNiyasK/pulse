import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { createOrGetAOneOnOneChat } from "../controllers/chat.controller";

const router = Router();

router.use(verifyJwt);

router.route("/c/:receiverId").post(createOrGetAOneOnOneChat);

export default router;
