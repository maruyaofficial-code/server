import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const PORT = 4000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// In-memory storage
let customers = [];
let riders = [];
let orders = [];

/**
 * REGISTER CUSTOMER OR RIDER
 */
app.post("/api/register", (req, res) => {
  const { name, phone, role } = req.body;

  if (!name || !phone || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (!["customer", "rider"].includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  // Check if phone already exists
  const exists = [...customers, ...riders].find(user => user.phone === phone);
  if (exists) {
    return res.status(400).json({ message: "Phone number already registered." });
  }

  const newUser = {
    id: Date.now(),
    name,
    phone,
    role
  };

  if (role === "customer") {
    customers.push(newUser);
  } else {
    riders.push(newUser);
  }

  res.json({ message: "Registration successful!", user: newUser });
});

/**
 * LOGIN
 */
app.post("/api/login", (req, res) => {
  const { phone, role } = req.body;

  if (!phone || !role) {
    return res.status(400).json({ message: "Phone and role are required." });
  }

  const user =
    role === "customer"
      ? customers.find(c => c.phone === phone)
      : riders.find(r => r.phone === phone);

  if (!user) {
    return res.status(404).json({ message: "User not found. Please register first." });
  }

  res.json({ message: "Login successful!", user });
});

/**
 * Place Order (Customer only)
 */
app.post("/api/orders", (req, res) => {
  const {
    customerId,
    pickupLocation,
    dropoffLocation,
    itemDescription,
    contactNumber
  } = req.body;

  if (!customerId || !pickupLocation || !dropoffLocation || !itemDescription || !contactNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newOrder = {
    id: Date.now(),
    customerId,
    pickupLocation,
    dropoffLocation,
    itemDescription,
    contactNumber,
    status: "Pending",
    rider: null,
  };

  orders.push(newOrder);
  io.emit("orderCreated", newOrder);

  res.json({ message: "Order placed successfully!", order: newOrder });
});

/**
 * Get Orders
 */
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

/**
 * Rider accepts an order
 */
app.post("/api/orders/:id/accept", (req, res) => {
  const { id } = req.params;
  const { riderId } = req.body;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  if (order.status !== "Pending") {
    return res.status(400).json({ message: "Order already accepted or completed." });
  }

  const rider = riders.find(r => r.id === riderId);
  if (!rider) return res.status(404).json({ message: "Rider not found!" });

  order.status = "Accepted";
  order.rider = rider;

  io.emit("orderUpdated", order);
  res.json({ message: `Order accepted by ${rider.name}`, order });
});

/**
 * Cancel Order (Customer)
 */
app.post("/api/orders/:id/cancel", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  order.status = "Cancelled";
  io.emit("orderUpdated", order);

  res.json({ message: "Order cancelled successfully!", order });
});

/**
 * Finish Order (Rider)
 */
app.post("/api/orders/:id/finish", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  order.status = "Completed";
  io.emit("orderUpdated", order);

  res.json({ message: "Order marked as completed!", order });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
