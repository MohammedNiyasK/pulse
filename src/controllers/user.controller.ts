import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { OTP } from "../models/otp.model";
import { User } from "../models/user.model";
import { generateAccessAndRefreshToken } from "../utils/helpers";
import { uploadOnCloudinary } from "../utils/cloudinary";

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, mobileNumber }: { username: string; mobileNumber: string } =
    req.body;
  const verifiedOtp = await OTP.findOne({ mobileNumber, isVerified: true });
  if (!verifiedOtp) {
    throw new ApiError(400, "Mobile number not verified");
  }
  if (await User.findOne({ mobileNumber })) {
    throw new ApiError(400, "User already exists");
  }
  console.log(req.files);
  console.log(req.body);
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  console.log("file", req.files);
  const avatarLocalPath = files.avatar[0]?.path;

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log("url:", avatar?.url);

  const user = await User.create({
    username,
    mobileNumber,
    avatar: avatar?.url,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id.toString()
  );

  await OTP.deleteOne({ mobileNumber });

  const loggedInUser = await User.findById(user._id).select("-refreshToken");
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
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Registration Succesfull"
      )
    );
});

export { registerUser };
