const jwt = require("jsonwebtoken");
require("dotenv/config");

const chechJWT = async (req, res, next) => {
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

    const { userId } = jwt.verify(userJwt, process.env.JSON_WEB_TOKEN_SECRET);
    req.body.userId = userId;
    return next();
  } catch {
    res.status(403).json("Invalid authorisation.");
  }
};

module.exports = { chechJWT };
