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
module.exports = { getSQLFromDifficulty };
