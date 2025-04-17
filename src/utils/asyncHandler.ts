import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "./ApiResponse";

const asyncHandler = <T>(
  cb: (req: Request, res: Response, next: NextFunction) => T
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cb(req, res, next);
    } catch (error: any) {
      let status = error?.statusCode || 500;
      console.log("statuscode:", error.statusCode);

      let message = error?.message || "Internal Server Error";
      res.status(status).json(new ApiResponse(status, {}, message));

      console.log("🚀 ~ file: asyncHandler.ts ~ error:", error);
    }
  };
};

export { asyncHandler };
