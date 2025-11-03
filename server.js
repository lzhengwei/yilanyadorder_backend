const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const products = [
  { id: 1, name: "經典白T", price: 390, image_url: "https://picsum.photos/200?1" },
  { id: 2, name: "黑色帽T", price: 890, image_url: "https://picsum.photos/200?2" },
  { id: 3, name: "帆布袋", price: 250, image_url: "https://picsum.photos/200?3" }
];

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/order", (req, res) => {
  console.log("收到訂單：", req.body);
  res.json({ message: "訂單已建立" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
