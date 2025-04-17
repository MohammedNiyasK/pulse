import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      // default: () => new Date(Date.now() + 15 * 1000),
      default: () => new Date(Date.now() + 2 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const OTP = mongoose.model("OTP", otpSchema);
