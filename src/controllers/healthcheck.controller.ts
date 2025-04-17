import { Request, Response } from "express";
const healthCheck = (req: Request, res: Response) => {
  res.send("server up and running");
};

export { healthCheck };
