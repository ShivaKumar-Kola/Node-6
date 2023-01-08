const express = require("express");
const csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
app.set("views", path.join(__dirname, "views"));
const { Todo, User } = require("./models");
const saltRounds = 10;
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(flash());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (email, password, done) => {
      User.findOne({ where: { email } })
        .then(async (user) => {
          if (!user) {
            return done(null, false, { message: "Incorrect username." });
          }
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password." });
          }
        })
        .catch((err) => {
          done(err, null);
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});



app.get("/", async function (request, response) {
  response.render("index", {
    title: "Todo Application",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Processing list of all Todos ...");
    try {
      const loggedInUser = request.user.id;
      const overdue = await Todo.overDue(loggedInUser);
      const later = await Todo.dueLater(loggedInUser);
      const today = await Todo.dueToday(loggedInUser);
      const complete = await Todo.completed(loggedInUser);

      const user = await User.findByPk(loggedInUser);
      const username =
        user.dataValues.firstName + " " + user.dataValues.lastName;

      if (request.accepts("html")) {
        response.render("todo", {
          overdue,
          later,
          today,
          complete,
          username,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({ overdue, today, later });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Looking for Todo with ID: ", request.params.id);
    try {
      const todo = await todo.findByPk(request.params.id);
      return response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (request.body.title.length == 0) {
      request.flash("error", "Please enter a title");
      response.redirect("/todos");
    }
    if (request.body.dueDate.length == 0) {
      request.flash("error", "Todo dueDate can't be empty");
      return response.redirect("/todos");
    }
    console.log("Creating new Todo: ", request.body);
    try {
      await Todo.addTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      });
      return response.redirect("/todos"); // response.json(todo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to update a Todo with ID: ", request.params.id);
    const todo = await Todo.findByPk(request.params.id);
    try {
      const updatedTodo = await todo.setCompletionStatus(
        request.body.completed
      );
      return response.json(updatedTodo);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Todo with ID: ", request.params.id);
    try {
      await Todo.remove(request.params.id, request.user.id);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// user routes
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signout", (request, response) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    } else {
      response.redirect("/");
    }
  });
});

app.post("/users", async (request, response) => {
  if (!request.body.email) {
    console.log("No email provided");
    request.flash("error", "Email can't be a null value");
    return response.redirect("/signup");
  }
  if (!request.body.firstName) {
    console.log("No name provided");
    request.flash("error", "Name can't be a null value");
    return response.redirect("/signup");
  }

  // check if email is already registered
  const user = await User.findOne({ where: { email: request.body.email } });
  if (user) {
    request.flash("error", "A user with this email address already exist");
    return response.redirect("/signup");
  }

  if (request.body.password.length < 8) {
    request.flash("error", "Password should be atleast 8 characters");
    return response.redirect("/signup");
  }
  // hasing the password
  const hashpwd = await bcrypt.hash(request.body.password, saltRounds); // take time so add await
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashpwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        request.flash("success", "Sign up successful");
        response.redirect("/todos");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});

app.get("/login", (request, response) => {
  if (request.user && request.user.id) {
    return response.redirect("/todos");
  }
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/todos");
  }
);

module.exports = app;