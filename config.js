// ============================================================
//  RAMANAND — SITE CONFIGURATION
//  Edit the values below with your real details.
//  No other file needs to be touched for these basic settings.
// ============================================================
module.exports = {
  RESTAURANT_NAME: "Ramanand",
  TAGLINE: "Pure Vegetarian Kitchen",

  // WhatsApp number that receives reservation & order messages.
  // Country code + number, digits only, no +, no spaces, no dashes.
  // Example for India: "919812345678"
  WHATSAPP_NUMBER: "919999999999",

  // Shown on the site (can be formatted nicely)
  PHONE_DISPLAY: "+91 99999 99999",
  EMAIL: "hello@ramanand.example",
  ADDRESS_LINE_1: "123, Prahladnagar Road",
  ADDRESS_LINE_2: "Ahmedabad, Gujarat - 380015",
  HOURS_LINE_1: "Mon – Sun : 11:00 AM – 11:30 PM",
  HOURS_LINE_2: "Kitchen closes 30 min before closing",

  // Google Maps embed — replace with your own "Share > Embed a map" src
  MAPS_EMBED_SRC: "https://www.google.com/maps?q=Ahmedabad,Gujarat&output=embed",

  // Session cookie signing secret — change this before going live
  SESSION_SECRET: "ramanand-change-this-secret-before-deploying",

  // First-run admin account (only used the very first time the server
  // starts, to create data/db.json). Change the password after logging in.
  DEFAULT_ADMIN_USERNAME: "admin",
  DEFAULT_ADMIN_PASSWORD: "ramanand@123",
};