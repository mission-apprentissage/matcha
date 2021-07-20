const { Formulaire } = require("../../../common/model");
const { runScript } = require("../../scriptWrapper");

runScript(async () => {
  const formsWithEvents = await Formulaire.find({ origine: "1J1S" }).select("_id email offres").lean();

  /**
   * Create an array with only duplicate formulaire that has the same email
   */

  const duplicates = formsWithEvents
    .reduce((acc, form) => {
      let index = acc.findIndex((i) => i.email === form.email);
      let hasOffer = form.offres.length > 0 ? true : false;
      if (index !== -1) {
        acc[index].forms.push({ ...form, hasOffer });
      } else {
        acc.push({ email: form.email, forms: [{ ...form, hasOffer }] });
      }
      return acc;
    }, [])
    .filter((x) => x.forms.length > 1);

  /**
   * Remove from the duplicates array all formulaire that have at least one offer and if not, keep at least one formulaire per email
   */

  const toRemove = duplicates
    .map((item) => {
      const index = item.forms.findIndex((x) => x.hasOffer === true);
      if (index !== -1) {
        item.forms.splice(index, 1);
      } else {
        item.forms.shift();
      }
      return item;
    })
    .map((x) => x.forms)
    .flat();

  let removed = 0;
  if (toRemove.length > 0) {
    await Promise.all(
      toRemove.map(async (x) => {
        await Formulaire.findByIdAndDelete(x._id);
        removed++;
      })
    );
  }

  console.log({
    allForms: formsWithEvents.length,
    duplicates: duplicates.length,
    toRemove: toRemove.length,
    removed,
  });
});
