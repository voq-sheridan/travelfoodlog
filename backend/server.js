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

// CREATE a new place
app.post("/places", async (req, res) => {
  try {
    const place = new Place(req.body);
    await place.save();
    res.status(201).json(place);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// READ all places
app.get("/places", async (req, res) => {
  try {
    const places = await Place.find();
    res.json(places);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ a single place
app.get("/places/:id", async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: "Not found" });
    res.json(place);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a place
app.put("/places/:id", async (req, res) => {
  try {
    const updated = await Place.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE a place
app.delete("/places/:id", async (req, res) => {
  try {
    const deleted = await Place.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
