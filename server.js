import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const PORT = 4000;

// Create HTTP + WebSocket server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

let orders = [];

/**
 * Create a new order
 */
app.post("/api/orders", (req, res) => {
  const {
    customerName,
    pickupLocation,
    dropoffLocation,
    itemDescription,
    contactNumber,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  } = req.body;

  if (!customerName || !pickupLocation || !dropoffLocation || !itemDescription || !contactNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newOrder = {
    id: Date.now(),
    customerName,
    pickupLocation,
    dropoffLocation,
    itemDescription,
    contactNumber,
    status: "Pending",
    rider: null,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
  };

  orders.push(newOrder);

  io.emit("orderCreated", newOrder);
  res.json({ message: "Order placed successfully!", order: newOrder });
});

/**
 * Get all orders
 */
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

/**
 * Rider accepts an order
 */
app.post("/api/orders/:id/accept", (req, res) => {
  const { id } = req.params;
  const { riderName } = req.body;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  if (order.status !== "Pending") {
    return res.status(400).json({ message: "Order already accepted or completed." });
  }

  order.status = "Accepted";
  order.rider = riderName;

  io.emit("orderUpdated", order);
  res.json({ message: `Order accepted by ${riderName}`, order });
});

/**
 * Rider updates location
 */
app.post("/api/orders/:id/location", (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.riderLat = lat;
  order.riderLng = lng;

  io.emit("riderLocationUpdated", { id: order.id, lat, lng });
  res.json({ message: "Location updated successfully!" });
});

/**
 * Cancel an order
 */
app.post("/api/orders/:id/cancel", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  if (order.status === "Completed") {
    return res.status(400).json({ message: "Cannot cancel a completed order." });
  }

  order.status = "Cancelled";

  io.emit("orderUpdated", order);
  res.json({ message: "Order has been cancelled", order });
});

/**
 * Finish an order
 */
app.post("/api/orders/:id/finish", (req, res) => {
  const { id } = req.params;

  const order = orders.find(o => o.id === Number(id));
  if (!order) return res.status(404).json({ message: "Order not found!" });

  if (order.status !== "Accepted") {
    return res.status(400).json({ message: "Only accepted orders can be finished." });
  }

  order.status = "Completed";

  io.emit("orderUpdated", order);
  res.json({ message: "Order marked as completed", order });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
