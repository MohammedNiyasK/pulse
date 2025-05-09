import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError";
import { NextFunction, Request, Response } from "express";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err: any) => ({
    [err.path]: err.msg,
  }));
  throw new ApiError(422, "Received data is not valid", extractedErrors);
};
