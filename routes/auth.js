const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");

// Register page
router.get("/register", (req, res) => {
  res.render("register");
});

// Register user
router.post("/register", async (req, res) => {
  const { name, email, phone, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email,
    phone,
    password: hashedPassword
  });

  await user.save();

  res.redirect("/login");
});

// Login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.send("User not found");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send("Wrong password");

  req.session.user = user;

  res.redirect("/dashboard"); 
});

// Dashboard
router.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.render("dashboard", { user: req.session.user });
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;