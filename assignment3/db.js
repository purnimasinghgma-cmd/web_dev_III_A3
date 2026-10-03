// Step -1 import module
const mongoose = require("mongoose");

// Step -2 Connection building
const connection = mongoose.connect("mongodb://127.0.0.1:27017/inventory_db");

// Step -3 Making structure 
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    reorderLevel: { type: Number, required: true },
    supplier: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual calculation for dynamic stockValue
productSchema.virtual("stockValue").get(function () {
  return this.price * this.quantity;
});

// Step -4 Making Model
const productModel = mongoose.model("product", productSchema);

// Step -5 Export module for using in index.js
module.exports = { connection, productModel };