// backend/models/place.js
const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    // A. Dish & location
    dishName: { type: String, required: true },

    locationCity: { type: String, required: true },
    locationCountry: { type: String, required: true },

    placeType: { type: String }, // Street Food, Cafe, Restaurant

    // B. Rating & price
    rating: { type: Number, min: 1, max: 5, required: true },
    priceLevel: { type: String }, // $, $$, $$$

    // C. Tags & date
    KeywordTags: { type: [String], default: [] },
    visitDate: { type: Date, required: true },

    // D. Notes & photo
    notes: { type: String },
    photoUrl: { type: String },

    visited: { type: Boolean, default: true }, // optional
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Place", placeSchema);
