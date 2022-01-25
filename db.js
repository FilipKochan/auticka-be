const mysql = require("mysql");
require("dotenv/config");
const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_NAME,
});
con.connect((err) => {
  if (err) throw err;
});

const conQuery = (query, callback) => {
  con.query(query, (err, result, _) => {
    if (err) throw err;
    callback(result);
  });
};

module.exports = { conQuery, con };
