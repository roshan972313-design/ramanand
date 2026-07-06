// ============================================================
//  RAMANAND — DATA LAYER
//  Simple JSON-file database. No external database server needed.
//  Everything lives in /data/db.json so the owner can even open
//  it in a text editor if curious. Good for a single restaurant's
//  scale of traffic.
// ============================================================
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const config = require("./config");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function seedMenu() {
  const items = [
    // Soups
    ["Soups", "Tomato Basil Soup", "Slow-simmered tomato, basil & a touch of cream", 120, true],
    ["Soups", "Sweet Corn Soup", "Comforting corn broth, lightly peppered", 130, false],
    ["Soups", "Hot & Sour Soup", "Tangy, peppery, loaded with vegetables", 140, false],

    // Starters
    ["Starters", "Paneer Tikka", "Char-grilled cottage cheese, smoky tandoor spices", 220, true],
    ["Starters", "Hara Bhara Kabab", "Spinach & peas kabab, mint chutney", 180, false],
    ["Starters", "Crispy Corn Chaat", "Golden fried corn, tossed in tangy masala", 170, false],
    ["Starters", "Chilli Paneer (Dry)", "Indo-Chinese classic, sweet-spicy-tangy", 230, true],
    ["Starters", "Gobi Manchurian", "Crisp cauliflower in Manchurian glaze", 200, false],
    ["Starters", "Veg Spring Roll", "Crunchy vegetable rolls, sweet chilli dip", 190, false],

    // Main Course
    ["Main Course", "Paneer Butter Masala", "Cottage cheese in velvety tomato-butter gravy", 260, true],
    ["Main Course", "Malai Kofta", "Cashew-paneer dumplings in a rich, creamy curry", 270, true],
    ["Main Course", "Dal Makhani", "Black lentils, slow-cooked overnight, finished with cream", 220, true],
    ["Main Course", "Shahi Paneer", "Royal-style paneer in a mildly sweet cashew gravy", 260, false],
    ["Main Course", "Palak Paneer", "Paneer cubes in a silky spiced spinach puree", 240, true],
    ["Main Course", "Kadai Vegetable", "Seasonal veggies, coarsely ground kadai masala", 230, false],
    ["Main Course", "Mix Veg Curry", "Garden vegetables in a light home-style gravy", 210, false],
    ["Main Course", "Chole Masala", "Chickpeas simmered in a tangy onion-tomato masala", 200, false],
    ["Main Course", "Yellow Dal Tadka", "Everyday dal, finished with a ghee-cumin tempering", 180, false],

    // Rice & Biryani
    ["Rice & Biryani", "Ramanand Veg Biryani", "Fragrant basmati, layered vegetables, house spices", 240, true],
    ["Rice & Biryani", "Veg Pulao", "Mildly spiced rice with garden vegetables", 190, false],
    ["Rice & Biryani", "Jeera Rice", "Basmati tempered with roasted cumin", 150, false],
    ["Rice & Biryani", "Curd Rice", "Cooling curd rice, a light South Indian finish", 160, false],

    // Breads
    ["Breads", "Tandoori Roti", "Whole-wheat bread from the clay oven", 30, false],
    ["Breads", "Butter Naan", "Classic leavened bread, brushed with butter", 50, true],
    ["Breads", "Garlic Naan", "Naan topped with roasted garlic & coriander", 60, false],
    ["Breads", "Lachha Paratha", "Layered, flaky whole-wheat paratha", 55, false],
    ["Breads", "Missi Roti", "Gram-flour roti with ajwain & spices", 40, false],

    // South Indian
    ["South Indian", "Masala Dosa", "Crisp rice crepe, spiced potato filling, sambhar", 150, true],
    ["South Indian", "Idli Sambhar", "Steamed rice cakes (2 pc), sambhar & chutney", 110, false],
    ["South Indian", "Medu Vada", "Crisp lentil doughnuts (2 pc), sambhar & chutney", 100, false],
    ["South Indian", "Uttapam", "Thick rice pancake, onion & tomato topping", 140, false],

    // Desserts
    ["Desserts", "Gulab Jamun", "Milk dumplings (2 pc) in rose-cardamom syrup", 90, true],
    ["Desserts", "Rasmalai", "Soft cottage-cheese discs (2 pc) in saffron milk", 120, false],
    ["Desserts", "Gajar Ka Halwa", "Slow-cooked carrot halwa, khoya & nuts", 130, false],
    ["Desserts", "Kaju Katli (100g)", "Classic cashew fudge, silver leaf", 150, false],

    // Beverages
    ["Beverages", "Masala Chai", "Spiced milk tea, brewed the classic way", 40, false],
    ["Beverages", "Sweet Lassi", "Thick, chilled yoghurt drink", 90, true],
    ["Beverages", "Fresh Lime Soda", "Sweet, salted or plain — your choice", 70, false],
    ["Beverages", "Cold Coffee", "Blended chilled coffee, a scoop of froth", 110, false],
    ["Beverages", "Buttermilk (Chaas)", "Spiced, tempered chaas — light & cooling", 50, false],
    ["Beverages", "Mineral Water", "Packaged drinking water", 30, false],
  ];

  return items.map((row, i) => ({
    id: i + 1,
    category: row[0],
    name: row[1],
    description: row[2],
    price: row[3],
    popular: row[4],
    veg: true,
    available: true,
  }));
}

function defaultData() {
  const menu = seedMenu();
  return {
    users: [
      {
        id: 1,
        username: config.DEFAULT_ADMIN_USERNAME,
        passwordHash: bcrypt.hashSync(config.DEFAULT_ADMIN_PASSWORD, 10),
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ],
    menu,
    reservations: [],
    orders: [],
    nextIds: {
      menu: menu.length + 1,
      reservations: 1,
      orders: 1,
    },
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    save(defaultData());
    console.log("Created new data/db.json with seed menu + default admin user.");
  }
}

function load() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { load, save };