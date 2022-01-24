const express = require("express");
const { conQuery } = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv/config");
const router = express.Router();
const SECRET_KEY = process.env.JSON_WEB_TOKEN_SECRET;

router.post("/login", (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      res.sendStatus(403);
      return;
    }

    conQuery(`SELECT * FROM uzivatele WHERE username='${name}'`, (result) => {
      if (result.length !== 1) {
        res.sendStatus(403);
        return;
      }
      const passwordHash = result[0].password;
      const verified = bcrypt.compareSync(password, passwordHash);
      if (!verified) {
        res.status(403).json("Incorrect password.");
        return;
      }

      res.json({
        userJwt: jwt.sign({ userId: result[0].iduzivatel, name }, SECRET_KEY),
      });
    });
  } catch {
    res.sendStatus(403);
  }
});

router.post("/new", (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      res.sendStatus(403);
      return;
    }

    conQuery(
      `SELECT * FROM \`uzivatele\` WHERE username='${name}'`,
      (result) => {
        if (result.length !== 0) {
          res.status(400).json("Username already exists.");
          return;
        }

        conQuery(
          `INSERT INTO \`uzivatele\`(\`username\`, \`password\`) VALUES ('${name}', '${bcrypt.hashSync(
            password
          )}')`,
          ({ insertId }) => {
            res.json({
              userJwt: jwt.sign({ userId: insertId, name }, SECRET_KEY),
            });
          }
        );
      }
    );
  } catch {
    res.sendStatus(403);
  }
});

module.exports = router;
