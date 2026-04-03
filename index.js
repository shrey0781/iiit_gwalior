const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");

const app = express();

connectDB();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

app.use("/", authRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});