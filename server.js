// ============================================================
//  RAMANAND — BACKEND SERVER
//  Express server that:
//    - Serves the public website (/public)
//    - Serves the admin dashboard (/admin)
//    - Provides a JSON API for menu, reservations, orders
//    - Handles admin login (session-based auth)
// ============================================================
const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const config = require("./config");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    name: "ramanand.sid",
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    },
  })
);

// ---------- static files ----------
app.use("/", express.static(path.join(__dirname, "public")));
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.get("/admin", (req, res) => res.redirect("/admin/login.html"));

// ---------- helpers ----------
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

function publicMenuItem(item) {
  const { id, category, name, description, price, popular, veg, available } = item;
  return { id, category, name, description, price, popular, veg, available };
}

// ============================================================
//  PUBLIC API
// ============================================================

// Site-wide settings the frontend needs (safe subset only)
app.get("/api/config", (req, res) => {
  res.json({
    restaurantName: config.RESTAURANT_NAME,
    tagline: config.TAGLINE,
    whatsappNumber: config.WHATSAPP_NUMBER,
    phoneDisplay: config.PHONE_DISPLAY,
    email: config.EMAIL,
    addressLine1: config.ADDRESS_LINE_1,
    addressLine2: config.ADDRESS_LINE_2,
    hoursLine1: config.HOURS_LINE_1,
    hoursLine2: config.HOURS_LINE_2,
    mapsEmbedSrc: config.MAPS_EMBED_SRC,
  });
});

// Menu — only items marked available
app.get("/api/menu", (req, res) => {
  const data = db.load();
  const items = data.menu.filter((m) => m.available).map(publicMenuItem);
  res.json({ items });
});

// Reservations — customer submits, we save it AND the frontend also
// opens WhatsApp so the restaurant gets pinged immediately.
app.post("/api/reservations", (req, res) => {
  const { name, phone, date, time, guests, note } = req.body || {};
  if (!name || !phone || !date || !time || !guests) {
    return res.status(400).json({ error: "Please fill in name, phone, date, time and guests." });
  }
  const data = db.load();
  const reservation = {
    id: data.nextIds.reservations++,
    name: String(name).trim(),
    phone: String(phone).trim(),
    date,
    time,
    guests: Number(guests),
    note: note ? String(note).trim() : "",
    status: "pending", // pending -> confirmed / cancelled (set by owner after WhatsApp reply)
    createdAt: new Date().toISOString(),
  };
  data.reservations.push(reservation);
  db.save(data);
  res.json({ ok: true, id: reservation.id });
});

// Orders — customer submits, we save it AND the frontend also opens
// WhatsApp with the order summary.
app.post("/api/orders", (req, res) => {
  const { name, phone, items, note, orderType, address } = req.body || {};
  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Please add items and fill in name & phone." });
  }
  const data = db.load();
  const cleanItems = items.map((it) => ({
    id: Number(it.id),
    name: String(it.name),
    price: Number(it.price),
    qty: Number(it.qty),
  }));
  const total = cleanItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  const order = {
    id: data.nextIds.orders++,
    name: String(name).trim(),
    phone: String(phone).trim(),
    orderType: orderType === "delivery" ? "delivery" : "pickup",
    address: address ? String(address).trim() : "",
    items: cleanItems,
    total,
    note: note ? String(note).trim() : "",
    status: "pending", // pending -> confirmed -> preparing -> completed / cancelled
    createdAt: new Date().toISOString(),
  };
  data.orders.push(order);
  db.save(data);
  res.json({ ok: true, id: order.id, total: order.total });
});

// ============================================================
//  AUTH
// ============================================================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required." });
  }
  const data = db.load();
  const user = data.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ username: req.session.username });
});

app.put("/api/admin/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  const data = db.load();
  const user = data.users.find((u) => u.id === req.session.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  db.save(data);
  res.json({ ok: true });
});

// ============================================================
//  ADMIN API (all require login)
// ============================================================

// ---- reservations ----
app.get("/api/admin/reservations", requireAuth, (req, res) => {
  const data = db.load();
  res.json({ items: [...data.reservations].reverse() });
});

app.put("/api/admin/reservations/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const data = db.load();
  const item = data.reservations.find((r) => r.id === id);
  if (!item) return res.status(404).json({ error: "Reservation not found." });
  if (status) item.status = status;
  db.save(data);
  res.json({ ok: true, item });
});

app.delete("/api/admin/reservations/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = db.load();
  data.reservations = data.reservations.filter((r) => r.id !== id);
  db.save(data);
  res.json({ ok: true });
});

// ---- orders ----
app.get("/api/admin/orders", requireAuth, (req, res) => {
  const data = db.load();
  res.json({ items: [...data.orders].reverse() });
});

app.put("/api/admin/orders/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const data = db.load();
  const item = data.orders.find((o) => o.id === id);
  if (!item) return res.status(404).json({ error: "Order not found." });
  if (status) item.status = status;
  db.save(data);
  res.json({ ok: true, item });
});

app.delete("/api/admin/orders/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = db.load();
  data.orders = data.orders.filter((o) => o.id !== id);
  db.save(data);
  res.json({ ok: true });
});

// ---- menu management ----
app.get("/api/admin/menu", requireAuth, (req, res) => {
  const data = db.load();
  res.json({ items: data.menu });
});

app.post("/api/admin/menu", requireAuth, (req, res) => {
  const { category, name, description, price, popular, available } = req.body || {};
  if (!category || !name || price === undefined) {
    return res.status(400).json({ error: "Category, name and price are required." });
  }
  const data = db.load();
  const item = {
    id: data.nextIds.menu++,
    category: String(category).trim(),
    name: String(name).trim(),
    description: description ? String(description).trim() : "",
    price: Number(price),
    popular: Boolean(popular),
    veg: true,
    available: available === undefined ? true : Boolean(available),
  };
  data.menu.push(item);
  db.save(data);
  res.json({ ok: true, item });
});

app.put("/api/admin/menu/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = db.load();
  const item = data.menu.find((m) => m.id === id);
  if (!item) return res.status(404).json({ error: "Menu item not found." });
  const { category, name, description, price, popular, available } = req.body || {};
  if (category !== undefined) item.category = String(category).trim();
  if (name !== undefined) item.name = String(name).trim();
  if (description !== undefined) item.description = String(description).trim();
  if (price !== undefined) item.price = Number(price);
  if (popular !== undefined) item.popular = Boolean(popular);
  if (available !== undefined) item.available = Boolean(available);
  db.save(data);
  res.json({ ok: true, item });
});

app.delete("/api/admin/menu/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = db.load();
  data.menu = data.menu.filter((m) => m.id !== id);
  db.save(data);
  res.json({ ok: true });
});

// ---- simple dashboard summary ----
app.get("/api/admin/summary", requireAuth, (req, res) => {
  const data = db.load();
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    totalReservations: data.reservations.length,
    pendingReservations: data.reservations.filter((r) => r.status === "pending").length,
    todaysReservations: data.reservations.filter((r) => r.date === today).length,
    totalOrders: data.orders.length,
    pendingOrders: data.orders.filter((o) => o.status === "pending").length,
    revenueToday: data.orders
      .filter((o) => o.createdAt.slice(0, 10) === today && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0),
    menuCount: data.menu.length,
  });
});

app.listen(PORT, () => {
  console.log(`Ramanand server running: http://localhost:${PORT}`);
  console.log(`Admin login:            http://localhost:${PORT}/admin/login.html`);
});