const express = require("express");
const { conQuery, con } = require("../db");
const jwt = require("jsonwebtoken");
const { TEST_LENGTHS, TEST_DIFFICULTIES } = require("../constants");
const { getSQLFromDifficulty } = require("../utils");
require("dotenv/config");
const router = express.Router();

router.use("/new", async (req, res, next) => {
  try {
    const { length, difficulty } = req.body;

    if (
      !TEST_LENGTHS.includes(length) ||
      !TEST_DIFFICULTIES.includes(difficulty)
    ) {
      return res.status(400).json("Invalid test parameters!");
    }

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

router.use("/:testId/:question", (req, res, next) => {
  const { testId } = req.params;
  conQuery(
    `SELECT iduzivatele FROM zaznamytestu WHERE idtestu = ${testId}`,
    (result) => {
      if (result[0].iduzivatele !== req.body.userId) {
        return res.status(403).json("You can acces only your own tests!");
      }
      return next();
    }
  );
});
router.get("/:testId/:question", (req, res) => {
  try {
    const { testId, question } = req.params;
    const vyslednaSituace = {};
    conQuery(
      `SELECT spawn, trasa, rychlost, prednostnijizda, idauta 
      FROM autasituace 
      NATURAL JOIN zaznamyodpovedi 
      WHERE idtestu = ${testId} AND poradivtestu = ${question}`,
      (auta) => {
        if (!auta[0]) return res.status(400).json("Question does not exist.");
        vyslednaSituace.auta = auta;

        conQuery(
          `SELECT odpoved, odpovedisituace.idodpovedi 
          FROM odpovedisituace 
          INNER JOIN zaznamyodpovedi 
          USING(idsituace)
          WHERE idtestu = ${testId} AND poradivtestu = ${question}`,
          (odpovedi) => {
            if (!odpovedi[0])
              return res.status(400).json("Question does not exist.");

            vyslednaSituace.odpovedi = odpovedi;
            conQuery(
              `SELECT mapa, otazka 
              FROM situace 
              NATURAL JOIN zaznamyodpovedi 
              WHERE idtestu = ${testId} AND poradivtestu = ${question}`,
              (situace) => {
                if (!situace[0])
                  return res.status(400).json("Question does not exist.");

                vyslednaSituace.mapa = situace[0].mapa;
                vyslednaSituace.otazka = situace[0].otazka;

                res.json(vyslednaSituace);
              }
            );
          }
        );
      }
    );
  } catch {
    res.sendStatus(500);
  }
});

module.exports = router;
