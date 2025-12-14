// backend/server.js
require("dotenv").config(); // load .env first

const express = require("express");
const cors = require("cors");
const axios = require("axios");
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

//
// ===== Restaurant Search API (Google Places Text Search) =====
//
app.get("/restaurants/search", async (req, res) => {
  try {
    const { query, location } = req.query;

    if (!query && !location) {
      return res
        .status(400)
        .json({ error: "Missing query or location parameter." });
    }

    // e.g. "ramen in Toronto, ON"
    const textQuery = location
      ? `${query || "restaurants"} in ${location}`
      : query;

    const response = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      {
        textQuery,
        pageSize: 10,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel",
        },
      }
    );

    const restaurants = (response.data.places || []).map((p) => ({
      externalId: p.id,
      name: p.displayName?.text,
      address: p.formattedAddress,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      rating: p.rating,
      priceLevel: p.priceLevel || null, // ✅ NEW
      source: "google-places",
    }));

    res.json(restaurants);
  } catch (error) {
    console.error(
      "Error searching restaurants:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to search restaurants." });
  }
});

//
// ===== Existing CRUD for your own places =====
//

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
    const updated = await Place.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
