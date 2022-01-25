const express = require("express");
const { conQuery, con } = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv/config");
const router = express.Router();
const SECRET_KEY = process.env.JSON_WEB_TOKEN_SECRET;

router.post("/login", async (req, res) => {
  try {
    const { name, password, token } = req.body;
    const isHuman = await validateHuman(token);
    if (!isHuman) {
      return res.status(403).json("Captcha nebyla správně vyplněna!");
    }

    if (!name || !password) {
      return res.sendStatus(403);
    }

    conQuery(
      `SELECT * FROM uzivatele WHERE username=${con.escape(name)}`,
      (result) => {
        if (result.length !== 1) {
          return res.sendStatus(403);
        }
        const passwordHash = result[0].password;
        const verified = bcrypt.compareSync(password, passwordHash);
        if (!verified) {
          return res.sendStatus(403);
        }

        return res.json({
          jwt: jwt.sign({ id: result[0].iduzivatel, name }, SECRET_KEY),
          name,
          id: result[0].iduzivatel,
        });
      }
    );
  } catch (e) {
    res.status(403);
  }
});

const validateHuman = async (token) => {
  const secret = process.env.SECRET_KEY;
  const response = await axios.post(
    `https://google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
  );
  return response.data.success;
};

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

router.post("/new", async (req, res) => {
  try {
    const { name, password, token } = req.body;

    const isHuman = await validateHuman(token);
    if (!isHuman) {
      return res.status(403).json("Captcha nebyla správně vyplněna!");
    }

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
      `SELECT * FROM \`uzivatele\` WHERE username=${con.escape(name)}`,
      (result) => {
        if (result.length !== 0) {
          return res.status(400).json("Jméno již existuje.");
        }

        conQuery(
          `INSERT INTO \`uzivatele\`(\`username\`, \`password\`) VALUES (${con.escape(
            name
          )}, '${bcrypt.hashSync(password)}')`,
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
