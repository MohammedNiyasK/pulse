import logger from "../logger/winston.logger";
import { User } from "../models/user.model";
import { ApiError } from "./ApiError";
import { Request } from "express";
import fs from "fs";

const generateOtpNumber = (length = 6) => {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

const generateAccessAndRefreshToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const getStaticFilePath = (req: Request, fileName: string) => {
  return `${req.protocol}://${req.get("host")}/images/${fileName}`;
};

const getLocalPath = (fileName: string) => {
  return `public/images/${fileName}`;
};

function getAttachmentType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  return "other";
}

const removeLocalFile = (localPath: string) => {
  fs.unlink(localPath, (err) => {
    if (err) {
      logger.error("Error while removing local files", err);
    } else {
      logger.info("Removed local :", localPath);
    }
  });
};

export {
  generateOtpNumber,
  generateAccessAndRefreshToken,
  getStaticFilePath,
  getLocalPath,
  getAttachmentType,
  removeLocalFile,
};
