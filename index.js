const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 3001;

const user = require("./routes/user");
const tests = require("./routes/tests");
const { chechJWT } = require("./middleware");
app.use(bodyParser.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localho.st:3000"],
  })
);

app.use(chechJWT);
app.use("/user", user);
app.use("/tests", tests);

app.get("/", (_, res) =>
  res.send(
    'This is the api for <a href="https://nakrizovatkysrozumem.cz">nakrizovatkysrozumem.cz</a>.'
  )
);

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
