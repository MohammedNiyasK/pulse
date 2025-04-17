import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import {
  generateAccessAndRefreshToken,
  generateOtpNumber,
} from "../utils/helpers";
import twilio from "twilio";
import { OTP } from "../models/otp.model";
import { User } from "../models/user.model";

const generateOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  const recentOtp = await OTP.findOne({
    mobileNumber,
    expiresAt: { $gt: new Date() },
    isVerified: false,
  });

  if (recentOtp) {
    throw new ApiError(429, "Please wait before requesting new OTP");
  }

  const otp = generateOtpNumber(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const otpRecord = await OTP.create({
    mobileNumber,
    otp,
  });

  if (process.env.NODE_ENV == "production") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    try {
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        body: `your otp is : ${otp}`,
        from: "+12513223361",
        to: mobileNumber,
      });
    } catch (error) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw new ApiError(500, "Failed to send OTP");
    }
  } else {
    console.log(`OTP for ${mobileNumber}: ${otp}`);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        process.env.NODE_ENV === "production"
          ? { message: "OTP sent successfully" }
          : { otp, expiresAt },
        "OTP sent successfully"
      )
    );
});

const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    throw new ApiError(400, "Mobile number is required");
  }

  await OTP.deleteMany({ mobileNumber });

  const otp = generateOtpNumber(6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const otpRecord = await OTP.create({
    mobileNumber,
    otp,
  });

  if (process.env.NODE_ENV == "production") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    try {
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        body: `your otp is : ${otp}`,
        from: "+12513223361",
        to: mobileNumber,
      });
    } catch (error) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw new ApiError(500, "Failed to send OTP");
    }
  } else {
    console.log(`OTP for ${mobileNumber}: ${otp}`);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        process.env.NODE_ENV === "production"
          ? { message: "OTP sent successfully" }
          : { otp, expiresAt },
        "OTP resent successfully"
      )
    );
});

const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    throw new ApiError(400, "Mobile number & otp is required");
  }

  const otpRecord = await OTP.findOne({
    mobileNumber,
    otp,
    expiresAt: { $gt: new Date() },
    isVerified: false,
  });

  if (!otpRecord) {
    throw new ApiError(400, "Invalid OTP or OTP has expired");
  }

  const existingUser = await User.findOne({ mobileNumber });

  if (!existingUser) {
    otpRecord.isVerified = true;
    await otpRecord.save();
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isNewUser: true,
          mobileNumber,
        },
        "OTP verified . Please complete Registration"
      )
    );
  } else {
    otpRecord.isVerified = true;
    await otpRecord.save();
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      existingUser._id as string
    );
    await otpRecord.deleteOne({ mobileNumber });
    const loggedInUser = await User.findById(existingUser._id).select(
      "-refreshToken"
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            isNewUser: false,
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged In Successfully"
        )
      );
  }
});

export { generateOtp, verifyOtp, resendOtp };
