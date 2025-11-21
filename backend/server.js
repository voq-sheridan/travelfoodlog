const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const Place = require("./models/place");

const app = express();
app.use(cors());
app.use(express.json());

// connect to MongoDB
connectDB();

// test route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running and connected to MongoDB!" });
});

// ⭐ NEW ROUTE — get all places
app.get("/places", async (req, res) => {
  try {
    const allPlaces = await Place.find();
    res.json(allPlaces);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch places" });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
