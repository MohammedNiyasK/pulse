import { Socket } from "socket.io";
import { UserDocument } from "../models/user.model";

export interface CustomSocket extends Socket {
  user?: UserDocument;
}
