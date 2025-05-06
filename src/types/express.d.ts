import { User } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      files?:
        | {
            [fieldname: string]: Express.Multer.File[];
          }
        | Express.Multer.File[];
    }
  }
}
