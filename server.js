// Riaz Hossain
// WEB322 - Assignment 2: Library

const express = require("express");
const path = require("path");
const fs = require("fs");
const exphbs = require("express-handlebars");
const session = require("express-session");

const app = express();
const PORT = 3000;
const SITE_TITLE = "Honest Library";

const USER_FILE = path.join(__dirname, "users.json");
const BOOKS_FILE = path.join(__dirname, "books.json");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "web322_library_assignment_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 3
    }
  })
);

// Handlebars configuration
app.engine(
  "hbs",
  exphbs.engine({
    extname: ".hbs",
    partialsDir: path.join(__dirname, "views", "partials")
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// File functions
function getUsers() {
  try {
    const data = fs.readFileSync(USER_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users.json:", error.message);
    return {};
  }
}

function getBooks() {
  try {
    const data = fs.readFileSync(BOOKS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading books.json:", error.message);
    return [];
  }
}

function saveBooks(books) {
  try {
    fs.writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving books.json:", error.message);
    return false;
  }
}

// Converts one selected checkbox into an array
function getSelectedBooks(selectedBooks) {
  if (!selectedBooks) {
    return [];
  }

  if (Array.isArray(selectedBooks)) {
    return selectedBooks;
  }

  return [selectedBooks];
}

// Protects pages that require login
function ensureLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }

  next();
}

// Landing page
app.get("/", (req, res) => {
  const books = getBooks();

  res.render("landing", {
    title: SITE_TITLE,
    books: books.slice(0, 6),
    totalBooks: books.length
  });
});

// Login page
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/home");
  }

  res.render("login", {
    title: SITE_TITLE,
    errorMessage: ""
  });
});

// Login submission
app.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  const users = getUsers();

  if (!users[username]) {
    return res.render("login", {
      title: SITE_TITLE,
      errorMessage: "Not a registered username"
    });
  }

  if (users[username] !== password) {
    return res.render("login", {
      title: SITE_TITLE,
      errorMessage: "Invalid password"
    });
  }

  req.session.user = {
    username: username
  };

  res.redirect("/home");
});

// Protected home page
app.get("/home", ensureLogin, (req, res) => {
  const books = getBooks();

  const availableBooks = books.filter((book) => book.available);
  const borrowedBooks = books.filter((book) => !book.available);

  res.render("home", {
    title: SITE_TITLE,
    username: req.session.user.username,
    availableBooks: availableBooks,
    borrowedBooks: borrowedBooks
  });
});

// Borrow selected books
app.post("/borrow", ensureLogin, (req, res) => {
  const selectedBooks = getSelectedBooks(req.body.selectedBooks);

  if (selectedBooks.length === 0) {
    return res.redirect("/home");
  }

  const books = getBooks();

  books.forEach((book) => {
    if (selectedBooks.includes(book.title)) {
      book.available = false;
    }
  });

  if (!saveBooks(books)) {
    return res.status(500).send("Unable to borrow books");
  }

  res.redirect("/home");
});

// Return selected books
app.post("/return", ensureLogin, (req, res) => {
  const selectedBooks = getSelectedBooks(req.body.selectedBooks);

  if (selectedBooks.length === 0) {
    return res.redirect("/home");
  }

  const books = getBooks();

  books.forEach((book) => {
    if (selectedBooks.includes(book.title)) {
      book.available = true;
    }
  });

  if (!saveBooks(books)) {
    return res.status(500).send("Unable to return books");
  }

  res.redirect("/home");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);
      return res.status(500).send("Unable to log out");
    }

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// 404 page
app.use((req, res) => {
  res.status(404).send("404 - Page not found");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});