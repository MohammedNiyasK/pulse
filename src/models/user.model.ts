import mongoose, { Schema, Document } from "mongoose";
import jwt from "jsonwebtoken";

interface UserDocument extends Document {
  username: string;
  mobileNumber: string;
  avatar: string | null | undefined;
  refreshToken?: string | null | undefined;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      required: [true, "Please provide a username"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Please provide a mobile number"],
      unique: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAccessToken = function () {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET!;

  return jwt.sign(
    {
      _id: this._id,
      mobileNumber: this.mobileNumber,
      username: this.username,
    },
    accessTokenSecret,
    {
      expiresIn: 1 * 24 * 60 * 60,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;

  return jwt.sign(
    {
      _id: this._id,
    },
    refreshTokenSecret,
    {
      expiresIn: 7 * 24 * 60 * 60,
    }
  );
};

export const User = mongoose.model("User", userSchema);
