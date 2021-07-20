const logger = require("../../common/logger");
const { Formulaire } = require("../../common/model");
const { asyncForEach } = require("../../common/utils/asyncUtils");

async function getAllEvents(mail) {
  /**
   * select all formulaire with at least one entry in the mailing array
   * DO NOT ADD .LEAN() because update document requires atomic operators
   */
  const data = await Formulaire.find({ $nor: [{ mailing: { $exists: false } }, { mailing: { $size: 0 } }] });

  logger.info(`Fetching events for ${data.length} forms`);

  await asyncForEach(data, async (item) => {
    await asyncForEach(item.mailing, async ({ messageId }) => {
      const events = await mail.getAllEvents(messageId);

      if (!events || events.length === 0) {
        logger.info(`No events recovered - ${item.email} - ${messageId}`);
        return;
      }

      logger.info(`${item.email} : ${events.length} events recovered`);

      item.events = events;

      // update record using MongoDB API to avoid timestamp automatic update
      await Formulaire.collection.findOneAndUpdate({ _id: item._id }, item);
    });
  });

  logger.info(`Done!`);
}

module.exports = { getAllEvents };
