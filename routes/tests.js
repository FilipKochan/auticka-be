const express = require("express");
const { conQuery, con } = require("../db");
const jwt = require("jsonwebtoken");
const { TEST_LENGTHS, TEST_DIFFICULTIES } = require("../constants");
require("dotenv/config");
const router = express.Router();

router.use(async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      req.body.userId = 0;
      return next();
    }

    const regexp = /Bearer (.*)/;
    const userJwt = authorization.match(regexp)[1];
    if (!userJwt) {
      return res.sendStatus(403);
    }

    const { length, difficulty } = req.body;

    if (
      !TEST_LENGTHS.includes(length) ||
      !TEST_DIFFICULTIES.includes(difficulty)
    ) {
      return res.status(400).json("Invalid test parameters!");
    }

    const { userId } = jwt.verify(userJwt, process.env.JSON_WEB_TOKEN_SECRET);
    req.body.userId = userId;
    return next();
  } catch {
    res.sendStatus(403);
  }
});

router.post("/new", (req, res) => {
  try {
    const { userId, difficulty, length } = req.body;
    const q = getSQLFromDifficulty(difficulty);
    const d = new Date();
    const date = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    conQuery(`SELECT idsituace FROM situace ${q} LIMIT ${length}`, (ids) => {
      conQuery(
        `INSERT INTO \`zaznamytestu\`(\`typtestu\`, \`iduzivatele\`, \`datum\`) VALUES ('${length}', ${userId}, '${date}')`,
        ({ insertId }) => {
          conQuery(
            `INSERT INTO \`zaznamyodpovedi\`(\`idtestu\`, \`idsituace\`, \`poradivtestu\`) VALUES ${ids
              .map((sit, i) => `(${insertId}, ${sit.idsituace}, ${i})`)
              .join(",")}`,
            () => {
              return res.json({ testId: insertId });
            }
          );
        }
      );
    });
  } catch (e) {
    res.sendStatus(400);
  }
});

router.get("/:testId/:question", (req, res) => {});

const getSQLFromDifficulty = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return "ORDER BY kolikratspatnezodpovezeno";
    case "medium":
      return "ORDER BY RAND()";
    case "hard":
      return "ORDER BY kolikratspatnezodpovezeno DESC";
    default:
      return "";
  }
};

module.exports = router;
