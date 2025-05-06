import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { getAllMessages, sendMessage } from "../controllers/message.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.use(verifyJwt);

router
  .route("/:chatId")
  .get(getAllMessages)
  .post(upload.fields([{ name: "attachments", maxCount: 5 }]), sendMessage);

export default router;
