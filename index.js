const express = require("express");
const pg = require("pg");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const session = require("express-session");

require("dotenv").config();

let app = express()

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    }
}));

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'bucket_list',
        port: process.env.DB_PORT || 5432
        }
});

function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect("/");
    }
}

app.get("/", (req, res) => {
    res.render("landing", {
        loggedIn: req.session.loggedIn,
        error: ""
    });
});

app.post("/login", (req, res) => {

    if (process.env.ADMIN_USERNAME &&
        process.env.ADMIN_PASSWORD &&
        req.body.username === process.env.ADMIN_USERNAME &&
        req.body.password === process.env.ADMIN_PASSWORD) {

        req.session.regenerate(err => {
            if (err) {
                return res.status(500).send("Login error");
            }

            req.session.loggedIn = true;
            req.session.save(err => {
                if (err) {
                    return res.status(500).send("Session error");
                }
                res.redirect("/");
            });
        });

    } else {

        res.render("landing", {
            loggedIn: false,
            error: "Incorrect username or password"
        });

    }
});

// this gets data from postgres and dispalys it 
app.get("/countries", requireLogin, (req, res) => {
    knex.select("*").from("country").then(country => {
        res.render("displayCountry", {mycountry: country});
    }).catch(err => {
        console.log(err);
        res.status(500).send("Database error");
    });
});

app.get("/addCountry", requireLogin, (req, res) => {
    res.render("addCountry");
});

app.post("/addCountry", requireLogin, (req, res) => {
    knex("country").insert({
        country_name: req.body.country_name.toUpperCase(),
        popular_site: req.body.popular_site.toUpperCase(),
        capital: req.body.capital.toUpperCase(),
        population: req.body.population,
        visited: req.body.visited ? "Y" : "N"
    }).then(mycountry => {
        res.redirect("/countries");
    });
});

app.post("/deleteCountry/:id", requireLogin, (req, res) => {
    knex("country").where("country_id", req.params.id).del().then(mycountry => {
        res.redirect("/countries");
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
    });
});

app.get("/editCountry/:id", requireLogin, (req, res) => {
    knex.select("country_id", 
                "country_name",
                "popular_site",
                "capital", 
                "population", 
                "visited").from("country").where("country_id", req.params.id).then(country => {
        res.render("editCountry", {mycountry: country});
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
    });
});

app.post("/editCountry", requireLogin, (req, res) => {
    knex("country").where("country_id", parseInt(req.body.country_id)).update({
        country_name: req.body.country_name.toUpperCase(),
        popular_site: req.body.popular_site.toUpperCase(),
        capital: req.body.capital.toUpperCase(),
        population: req.body.population,
        visited: req.body.visited ? "Y" : "N"
    }).then(mycountry => {
        res.redirect("/countries");
    });
});

app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Logout error");
        }

        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Travel website is listening on port ${port}!`);
});

app.get("/health", (req, res) => {
    res.send("Server is working!");
});
