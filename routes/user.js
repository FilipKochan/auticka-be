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
      return res.sendStatus(403);
    }

    conQuery(`SELECT * FROM uzivatele WHERE username='${name}'`, (result) => {
      if (result.length !== 1) {
        return res.sendStatus(403);
      }
      const passwordHash = result[0].password;
      const verified = bcrypt.compareSync(password, passwordHash);
      if (!verified) {
        return res.sendStatus(403);
      }

      res.json({
        jwt: jwt.sign({ id: result[0].iduzivatel, name }, SECRET_KEY),
        name,
        id: result[0].iduzivatel,
      });
    });
  } catch {
    res.sendStatus(403);
  }
});

router.post("/verify", (req, res) => {
  try {
    const token = req.body?.jwt;
    if (!token) return res.sendStatus(403);
    if (jwt.verify(token, SECRET_KEY)) return res.sendStatus(200);
    return res.sendStatus(403);
  } catch {
    return res.sendStatus(403);
  }
});

router.post("/new", (req, res) => {
  try {
    const { name, password } = req.body;
    if (name === undefined) {
      return res.status(400).json("Nebylo zadáno jméno.");
    }
    if (
      !/^[a-zA-Z0-9èàùìòÈÀÒÙÌéáúíóÉÁÚÍÓëäüïöËÄÜÏÖêâûîôÊÂÛÎÔç'-]*$/.test(name)
    ) {
      return res.status(400).json("Jméno obsahuje nepovolené znaky.");
    }
    if (password === undefined) {
      return res.status(400).json("Nebylo zadáno heslo.");
    }
    if (password.length < 4) {
      return res.status(400).json("Heslo musí obsahovat alespoň 4 znaky.");
    }

    conQuery(
      `SELECT * FROM \`uzivatele\` WHERE username='${name}'`,
      (result) => {
        if (result.length !== 0) {
          return res.status(400).json("Jméno již existuje.");
        }

        conQuery(
          `INSERT INTO \`uzivatele\`(\`username\`, \`password\`) VALUES ('${name}', '${bcrypt.hashSync(
            password
          )}')`,
          ({ insertId }) => {
            res.json({
              jwt: jwt.sign({ id: insertId, name }, SECRET_KEY),
            });
          }
        );
      }
    );
  } catch {
    res.sendStatus(400);
  }
});

module.exports = router;
