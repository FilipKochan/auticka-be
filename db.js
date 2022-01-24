const mysql = require("mysql");

const con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "auticka",
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

module.exports = { conQuery };
