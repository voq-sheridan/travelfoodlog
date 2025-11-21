const express = require("express");
const cors = require("cors");
const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB
connectDB();

// test route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running and connected to MongoDB!" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
