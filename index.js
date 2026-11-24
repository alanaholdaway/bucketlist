const express = require("express");
const pg = require("pg");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");

require("dotenv").config();

let app = express()

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

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

// this gets data from postgres and dispalys it 
app.get("/", (req, res) => {
    knex.select("*").from("country").then(country => {
        res.render("displayCountry", {mycountry: country});
    });
});

app.get("/addCountry", (req, res) => {
    res.render("addCountry");
});

app.post("/addCountry", (req, res) => {
    knex("country").insert({
        country_name: req.body.country_name.toUpperCase(),
        popular_site: req.body.popular_site.toUpperCase(),
        capital: req.body.capital.toUpperCase(),
        population: req.body.population,
        visited: req.body.visited ? "Y" : "N"
    }).then(mycountry => {
        res.redirect("/");
    });
});

app.post("/deleteCountry/:id", (req, res) => {
    knex("country").where("country_id", req.params.id).del().then(mycountry => {
        res.redirect("/");
    }).catch(err => {
        console.log(err);
        res.status(500).json({err});
    });
});

app.get("/editCountry/:id", (req, res) => {
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

app.post("/editCountry", (req, res) => {
    knex("country").where("country_id", parseInt(req.body.country_id)).update({
        country_name: req.body.country_name.toUpperCase(),
        popular_site: req.body.popular_site.toUpperCase(),
        capital: req.body.capital.toUpperCase(),
        population: req.body.population,
        visited: req.body.visited ? "Y" : "N"
    }).then(mycountry => {
        res.redirect("/");
    });
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Travel website is listening on port ${port}!`);
});

app.get("/health", (req, res) => {
    res.send("Server is working!");
});
