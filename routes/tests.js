const express = require("express");
const { conQuery, con } = require("../db");
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

const doesUserHasTest = (req, res, next) => {
  const { testId } = req.params;
  conQuery(
    `SELECT iduzivatele, typtestu FROM zaznamytestu WHERE idtestu = ${testId}`,
    (result) => {
      if (!result[0]) {
        return res.status(400).json("Daný test neexistuje!");
      }
      if (result[0].iduzivatele !== req.body.userId) {
        return res.status(403).json("K této otázce nemáte přístup!");
      }

      req.body.testLength = result[0].typtestu;
      return next();
    }
  );
};

router.use("/results/:testId", doesUserHasTest);

router.get("/results/:testId", (req, res) => {
  const { testId } = req.params;
  conQuery(
    `
    SELECT 
      pocetspravnychodpovedi pocetspravnych, typtestu delka, poradivtestu poradi, otazka, o.idodpovedi idodpovedi, 
      z.idodpovedi odpoveduzivatele, spravnaodpoved, idsituace, odpoved textodpovedi
    FROM 
      (situace INNER JOIN odpovedisituace o USING(idsituace)) 
        INNER JOIN zaznamyodpovedi z USING(idsituace)
        NATURAl JOIN zaznamytestu
        WHERE idtestu = ${con.escape(testId)}
        ORDER BY poradivtestu
    `,
    (result) => {
      if (!result) return res.sendStatus(400);
      testResultResponse = {};
      testResultResponse["correctAnswers"] = result[0].pocetspravnych;
      testResultResponse["totalQuestions"] = result[0].delka;
      testResultResponse["situations"] = [];

      result.forEach(
        ({
          poradi,
          otazka,
          idodpovedi,
          odpoveduzivatele,
          spravnaodpoved,
          idsituace,
          textodpovedi,
        }) => {
          if (testResultResponse["situations"][poradi] === undefined) {
            const situace = {};
            situace["situationId"] = idsituace;
            situace["question"] = otazka;
            situace["correctAnswer"] = spravnaodpoved;
            situace["userAnswer"] = odpoveduzivatele;
            situace["possibleAnswers"] = [];
            testResultResponse["situations"][poradi] = situace;
          }
          testResultResponse["situations"][poradi]["possibleAnswers"].push({
            answerId: idodpovedi,
            answerText: textodpovedi,
          });
        }
      );

      res.json(testResultResponse);
    }
  );
});

router.use("/:testId/:question", doesUserHasTest);

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
        if (!auta[0]) return res.status(400).json("Daná otázka neexistuje.");
        vyslednaSituace.auta = auta;

        conQuery(
          `SELECT odpoved, odpovedisituace.idodpovedi 
          FROM odpovedisituace 
          INNER JOIN zaznamyodpovedi 
          USING(idsituace)
          WHERE idtestu = ${testId} AND poradivtestu = ${question}`,
          (odpovedi) => {
            if (!odpovedi[0])
              return res.status(400).json("Daná otázka neexistuje.");

            vyslednaSituace.odpovedi = odpovedi;
            conQuery(
              `SELECT mapa, otazka 
              FROM situace 
              NATURAL JOIN zaznamyodpovedi 
              WHERE idtestu = ${testId} AND poradivtestu = ${question}`,
              (situace) => {
                if (!situace[0])
                  return res.status(400).json("Daná otázka neexistuje.");

                vyslednaSituace.mapa = situace[0].mapa;
                vyslednaSituace.otazka = situace[0].otazka;

                res.json({
                  vyslednaSituace: vyslednaSituace,
                  testLength: req.body.testLength,
                });
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

router.post("/:testId/:question", (req, res) => {
  try {
    const { userAnswer } = req.body;
    const { testId, question } = req.params;
    if (userAnswer === undefined || typeof userAnswer !== "number") {
      return res.status(400).json("Odpověď není validní.");
    }
    conQuery(
      `UPDATE \`zaznamyodpovedi\` SET \`idodpovedi\` = ${con.escape(
        userAnswer
      )} WHERE idtestu = ${testId} AND poradivtestu = ${question} AND idodpovedi IS NULL`,
      ({ affectedRows }) => {
        if (affectedRows === 1) {
          return res.sendStatus(200);
        }
        res.status(400).json("Nelze odpovědět na již zodpovězenou otázku.");
      }
    );
  } catch {
    res.sendStatus(500);
  }
});

module.exports = router;
