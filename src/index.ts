import connectDB from "./db/database";

import { app } from "./app";

const port = parseInt(process.env.PORT || "3000");

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
