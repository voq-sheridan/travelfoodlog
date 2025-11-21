// backend/models/place.js
const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    placeName: { type: String, required: true },
    country: { type: String, required: true },
    placeType: { type: String },      // e.g. "Sightseeing", "Cafe", "Restaurant"
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String },
    visited: { type: Boolean, default: false },
  },
  {
    timestamps: true,                 // adds createdAt / updatedAt
  }
);

module.exports = mongoose.model("Place", placeSchema);
