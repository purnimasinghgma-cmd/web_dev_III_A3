// Step -1 import module
const express = require("express");
const { connection, productModel } = require("./db");

// Step -2 building application via express
const app = express();

app.use(express.json());

// Step -4 Making API
// Welcome Route
app.get("/", (req, res) => {
  res.send({ msg: "Welcome to Inventory Management System" });
});

// POST Route: Create a product
app.post("/api/products", async (req, res) => {
  const payload = req.body;
  try {
    const newProduct = new productModel(payload);
    await newProduct.save();
    
    // Format payload response according to expected output
    const productObj = newProduct.toObject();
    res.status(201).send(productObj);
  } catch (error) {
    res.status(400).send({ msg: "Something went wrong", error: error.message });
  }
});

// GET Route: Fetch all products with filtering, searching, sorting, & pagination
app.get("/api/products", async (req, res) => {
  try {
    const { category, search, sortBy, order, page = 1, limit = 10 } = req.query;
    
    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    let sortOption = {};
    if (sortBy) {
      sortOption[sortBy] = order === "desc" ? -1 : 1;
    } else {
      sortOption.createdAt = -1;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await productModel.countDocuments(query);
    const products = await productModel.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.send({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      count: products.length,
      products,
    });
  } catch (error) {
    res.status(500).send({ msg: "Something went wrong" });
  }
});

// GET Route: Low Stock Alert Report (quantity <= reorderLevel)
app.get("/api/products/low-stock", async (req, res) => {
  try {
    const lowStockItems = await productModel.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    });

    res.send({
      count: lowStockItems.length,
      lowStockItems,
    });
  } catch (error) {
    res.status(500).send({ msg: "Something went wrong" });
  }
});

// GET Route: Category-wise summary (Aggregation)
app.get("/api/products/summary", async (req, res) => {
  try {
    const summary = await productModel.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" }
        }
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: 1,
          avgPrice: { $round: ["$avgPrice", 2] }
        }
      }
    ]);

    res.send({
      categories: summary.length,
      summary
    });
  } catch (error) {
    res.status(500).send({ msg: "Something went wrong" });
  }
});

// GET Route: Read product by ID
app.get("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).send({ msg: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    res.status(500).send({ msg: "Something went wrong" });
  }
});

// PUT Route: Update product details
app.put("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  const payload = req.body;
  try {
    const updatedProduct = await productModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    
    if (!updatedProduct) {
      return res.status(404).send({ msg: "Product not found" });
    }
    
    res.send(updatedProduct);
  } catch (error) {
    res.status(400).send({ msg: "Something went wrong" });
  }
});

// PATCH Route: Stock level updates (Restock / Sale operations)
app.patch("/api/products/:id/stock", async (req, res) => {
  const id = req.params.id;
  const { change } = req.body;
  try {
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).send({ msg: "Product not found" });
    }

    if (product.quantity + change < 0) {
      return res.status(400).send({ msg: "Insufficient stock" });
    }

    product.quantity += change;
    await product.save();

    res.send({
      message: "Stock updated",
      product,
    });
  } catch (error) {
    res.status(400).send({ msg: "Something went wrong" });
  }
});

// DELETE Route: Remove product
app.delete("/api/products/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const deletedProduct = await productModel.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).send({ msg: "Product not found" });
    }
    
    res.send({
      message: "Product deleted",
      id: id,
    });
  } catch (error) {
    res.status(500).send({ msg: "Something went wrong" });
  }
});

// Step -3 Run app on 8080 port
app.listen(8080, async () => {
  try {
    // Step - 5 Connect server with DB
    await connection;
    console.log("DB Connected");
  } catch (error) {
    console.log(error);
  }
  console.log("Server started on port 8080");
});