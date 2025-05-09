import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { getAllMessages, sendMessage } from "../controllers/message.controller";
import { upload } from "../middlewares/multer.middleware";
import { mongoIdPathVariableValidator } from "../validators/mongodb.validators";
import { validate } from "../validators/validate";

const router = Router();

router.use(verifyJwt);

router
  .route("/:chatId")
  .get(mongoIdPathVariableValidator("chatId"), validate, getAllMessages)
  .post(
    upload.fields([{ name: "attachments", maxCount: 5 }]),
    mongoIdPathVariableValidator("chatId"),
    validate,
    sendMessage
  );

export default router;
