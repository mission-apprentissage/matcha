const { Formulaire } = require("../../common/model");
const { runScript } = require("../scriptWrapper");
const { rebuildIndex } = require("../../common/utils/esUtils");

runScript(async () => {
  await Formulaire.syncIndexes();
  await rebuildIndex("formulaires", Formulaire);
});
