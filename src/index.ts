import connectDB from "./db/database";
import { httpServer } from "./app";

const port = parseInt(process.env.PORT || "3000");

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
      console.log(`🔄 Socket.io server running`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
