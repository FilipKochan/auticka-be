const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;

const user = require("./routes/user");

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use("/user", user);

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
