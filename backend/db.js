const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  // If no MONGO_URI is provided, skip the DB connection so the
  // backend can still start for local frontend development and
  // so we get a clearer error in the server logs instead of the
  // fetch in the browser failing with "Failed to fetch".
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set. Skipping MongoDB connection (development mode).");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
