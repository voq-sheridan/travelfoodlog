const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    dishName: { type: String },

    locationCity: { type: String },
    locationCountry: { type: String },

    placeType: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    priceLevel: { type: String },

    KeywordTags: { type: [String], default: [] },
    visitDate: { type: Date },

    notes: { type: String },
    photoUrl: { type: String },

    visited: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Place", placeSchema);
