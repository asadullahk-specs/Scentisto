require("dotenv").config();
const { connectDB } = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error(
      "Check MONGODB_URI in .env, and that your current IP is allow-listed under Atlas → Network Access.",
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(
      `SCENTISTO API listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`,
    );
  });
}

start();
