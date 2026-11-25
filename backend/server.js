// Local / hosted Node server (needs MySQL). Not used on GitHub Pages.
// Run:  cd backend && npm install && cp .env.example .env && npm start
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const { check, validationResult } = require("express-validator");

const app = express();
const port = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "project",
  port: Number(process.env.DB_PORT) || 3306,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tell the front-end that a real backend is available (overrides js/config.js)
app.get("/js/config.js", (req, res) => {
  res.type("application/javascript").send("window.YUSSER_BACKEND = true;");
});

app.use(express.static(ROOT, { index: "index.html", dotfiles: "ignore" }));

const NAME_RE = /^[\p{L} ]+$/u;

const BookingRules = [
  check("fullname").trim().notEmpty().withMessage("Full Name is missing")
    .isLength({ min: 2, max: 30 }).withMessage("Full Name must be 2-30 characters")
    .matches(NAME_RE).withMessage("Full Name must contain letters only").escape(),
  check("mobile").trim().isNumeric().withMessage("Mobile must contain numbers only")
    .isLength({ min: 10, max: 10 }).withMessage("Mobile must be 10 digits"),
  check("email").trim().isEmail().withMessage("Email format is wrong").normalizeEmail(),
  check("dob").notEmpty().withMessage("Date of Birth is required")
    .isDate().withMessage("Date must be valid"),
  check("campaign_selection").isIn(["gold", "silver", "economy"]).withMessage("Please select a valid campaign"),
  check("trip_type").isIn(["Umrah", "Hajj"]).withMessage("Trip type is required"),
  check("guide_language").trim().notEmpty().withMessage("Guide language is required")
    .isLength({ max: 30 }).withMessage("Guide language too long").escape(),
  check("special_requests").optional().trim()
    .isLength({ max: 255 }).withMessage("Special requests too long").escape(),
];

const ContactRules = [
  check("first_name").trim().isLength({ min: 2, max: 30 }).withMessage("First Name must be 2-30 letters")
    .matches(NAME_RE).withMessage("First name must contain letters only").escape(),
  check("last_name").trim().isLength({ min: 2, max: 30 }).withMessage("Last Name must be 2-30 letters")
    .matches(NAME_RE).withMessage("Last name must contain letters only").escape(),
  check("mobile").trim().isNumeric().withMessage("Mobile must contain numbers only")
    .isLength({ min: 10, max: 10 }).withMessage("Mobile must be 10 digits"),
  check("email").trim().isEmail().withMessage("Email format is wrong").normalizeEmail(),
  check("language").isIn(["English", "Arabic", "French", "Other"]).withMessage("Language is required"),
  check("message").trim().isLength({ min: 5, max: 1000 }).withMessage("Message must be at least 5 characters").escape(),
  check("dob").notEmpty().withMessage("Date of Birth is required").isDate().withMessage("Date must be valid"),
  check("gender").isIn(["Male", "Female"]).withMessage("Gender is required"),
];

function printErrors(list) {
  return list.map((e) => "<p>" + e.msg + "</p>").join("");
}

app.post("/insertBooking", BookingRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(
      "<h1>Sorry, we found validation errors with your submission</h1>" +
      printErrors(errors.array()) + "<h2><a href='booking.html'>Click here</a> to return</h2>");
  }
  const data = {
    fullname: req.body.fullname,
    mobile: req.body.mobile,
    dob: req.body.dob,
    email: req.body.email,
    campaign_selection: req.body.campaign_selection,
    trip_type: req.body.trip_type,
    guide_language: req.body.guide_language,
    special_requests: req.body.special_requests || "",
  };
  pool.query("INSERT INTO booking SET ?", data, (err) => {
    if (err) {
      console.error("SQL Error (Booking):", err);
      return res.status(500).send("<h1>Database error occurred while saving your booking.</h1>");
    }
    res.send("<h1>Thank you, your booking has been saved.</h1><h2><a href='booking.html'>Make another booking</a></h2>");
  });
});

app.post("/insertContact", ContactRules, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(
      "<h1>Sorry, we found validation errors with your submission</h1>" +
      printErrors(errors.array()) + "<h2><a href='contactUS.html'>Click here</a> to return</h2>");
  }
  const data = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    mobile: req.body.mobile,
    email: req.body.email,
    language: req.body.language,
    message: req.body.message,
    dob: req.body.dob,
    gender: req.body.gender,
  };
  pool.query("INSERT INTO contact SET ?", data, (err) => {
    if (err) {
      console.error("SQL Error (Contact):", err);
      return res.status(500).send("<h1>Database error occurred</h1>");
    }
    res.send("<h1>Thank you, your message has been saved.</h1><h2><a href='contactUS.html'>Send another message</a></h2>");
  });
});

app.get("/viewBooking", (req, res) => {
  pool.query("SELECT * FROM booking", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
