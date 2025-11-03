const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

// 模擬商品資料
const products = [
  { id: 1, name: "經典白T", price: 390, image_url: "https://picsum.photos/200?1" },
  { id: 2, name: "黑色帽T", price: 890, image_url: "https://picsum.photos/200?2" },
  { id: 3, name: "帆布袋", price: 250, image_url: "https://picsum.photos/200?3" }
];

// 存放訂單的陣列（暫時記在記憶體）
const orders = [];

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/order", (req, res) => {
  const order = req.body; // { items: [...], buyer_name, email }
  order.id = orders.length + 1;
  order.created_at = new Date();
  orders.push(order);

  console.log("🧾 收到新訂單：", order);
  res.json({ message: "訂單已建立", order_id: order.id });
});

app.get("/api/orders", (req, res) => {
  res.json(orders);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
