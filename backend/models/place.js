const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    dishName: { type: String, required: true },

    locationCity: { type: String, required: true },
    locationCountry: { type: String, required: true },

    placeType: { type: String },
    rating: { type: Number, min: 1, max: 5, required: true },
    priceLevel: { type: String },

    KeywordTags: { type: [String], default: [] },
    visitDate: { type: Date, required: true },

    notes: { type: String },
    photoUrl: { type: String },

    visited: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Place", placeSchema);
