const express = require("express");
const { Formulaire } = require("../../common/model");
const tryCatch = require("../middlewares/tryCatchMiddleware");
const { getElasticInstance } = require("../../common/esClient");
const logger = require("../../common/logger");

const esClient = getElasticInstance();

module.exports = ({ mail, formulaire }) => {
  const router = express.Router();

  /**
   * Query search endpoint
   */
  router.get(
    "/",
    tryCatch(async (req, res) => {
      let qs = req.query;
      const query = qs && qs.query ? JSON.parse(qs.query) : {};
      const page = qs && qs.page ? qs.page : 1;
      const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 100;

      const result = await Formulaire.paginate(query, { page, limit, lean: true });

      const stats = {
        nbFormulaires: result.total,
        nbOffres: result.docs.reduce((acc, form) => (acc += form.offres.length), 0),
      };

      return res.json({
        stats,
        data: result.docs,
        pagination: {
          page: result.page,
          result_per_page: limit,
          number_of_page: result.pages,
          total: result.total,
        },
      });
    })
  );

  /**
   * Get form from id
   */
  router.get(
    "/:id_form",
    tryCatch(async (req, res) => {
      const { id_form } = req.params;
      let result = await Formulaire.findOne({ id_form }).lean();

      if (!result) {
        return res.sendStatus(401);
      }

      return res.json(result);
    })
  );

  /**
   * Post form
   */
  router.post(
    "/",
    tryCatch(async (req, res) => {
      const form = req.body;

      const newFormulaire = await formulaire.createForm(form);

      let { _id, id_form, raison_sociale, email } = newFormulaire;

      const mailBody = {
        id_form,
        email,
        raison_sociale,
        tags: ["matcha-nouveau-formulaire"],
        templateId: 178,
        subject: `Accédez à vos offres déposées sur Matcha`,
      };

      const payload = mail.getEmailBody(mailBody);

      const { body: result } = await mail.sendmail(payload);

      const message = {
        campagne: "matcha-nouveau-formulaire",
        code: result.code ?? null,
        message: result.message ?? null,
        messageId: result.messageId ?? null,
      };

      if (!result.messageId) {
        logger.info(`error : ${message.code} —— ${message.message} — ${email}`);
      }

      await Formulaire.findByIdAndUpdate(_id, { $push: { mailing: message } });

      return res.json(newFormulaire);
    })
  );

  /**
   * Put form
   */
  router.put(
    "/:id_form",
    tryCatch(async (req, res) => {
      const { id_form } = req.params;
      const form = req.body;

      const result = await Formulaire.findOneAndUpdate({ id_form }, form, { new: true });

      return res.json(result);
    })
  );

  /**
   * LBA ENDPOINT : get offer from id
   */
  router.get(
    "/offre/:id_offre",
    tryCatch(async (req, res) => {
      const { id_offre } = req.params;
      let result = await Formulaire.findOne({ "offres._id": id_offre });

      if (!result) {
        return res.status(400).json({ error: true, message: "Not found" });
      }

      result.offres = result.offres.filter((x) => x._id == id_offre);

      result.events = undefined;
      result.mailing = undefined;

      return res.json(result);
    })
  );

  /**
   * Post new offer to form
   */

  router.post(
    "/:id_form/offre",
    tryCatch(async (req, res) => {
      const { id_form } = req.params;
      const offre = req.body;

      const result = await Formulaire.findOneAndUpdate({ id_form }, { $push: { offres: offre } }, { new: true });

      return res.json(result);
    })
  );

  /**
   * Put existing offer from id
   */
  router.put(
    "/offre/:id_offre",
    tryCatch(async (req, res) => {
      const { id_offre } = req.params;
      const {
        libelle,
        romes,
        niveau,
        date_debut_apprentissage,
        description,
        date_creation,
        date_expiration,
        statut,
      } = req.body;

      const result = await Formulaire.findOneAndUpdate(
        { "offres._id": id_offre },
        {
          $set: {
            "offres.$.libelle": libelle,
            "offres.$.romes": romes,
            "offres.$.niveau": niveau,
            "offres.$.date_debut_apprentissage": date_debut_apprentissage,
            "offres.$.description": description,
            "offres.$.date_creation": date_creation,
            "offres.$.date_expiration": date_expiration,
            "offres.$.statut": statut,
          },
        },
        { new: true }
      );

      return res.json(result);
    })
  );

  /**
   * LBA ENDPOINT
   */
  router.post(
    "/search",
    tryCatch(async (req, res) => {
      const { distance, lat, lon, romes } = req.body;

      if (!distance || !lat || !lon || !romes) {
        return res.status(400).json({ error: "Argument is missing (distance, lat, lon, romes)" });
      }

      const body = {
        query: {
          bool: {
            must: [
              {
                nested: {
                  path: "offres",
                  query: {
                    bool: {
                      must: [
                        {
                          match: {
                            "offres.romes": romes.join(" "),
                          },
                        },
                        {
                          match: {
                            "offres.statut": "Active",
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
            filter: [
              {
                geo_distance: {
                  distance: `${distance}km`,
                  geo_coordonnees: {
                    lat,
                    lon,
                  },
                },
              },
            ],
          },
        },
        sort: [
          {
            _geo_distance: {
              geo_coordonnees: {
                lat,
                lon,
              },
              order: "asc",
              unit: "km",
              mode: "min",
              distance_type: "arc",
              ignore_unmapped: true,
            },
          },
        ],
      };

      const result = await esClient.search({ index: "formulaires", body });

      const filtered = result.body.hits.hits.map((x) => {
        let offres = [];

        if (x._source.offres.length === 0) {
          return;
        }

        x._source.mailing = undefined;
        x._source.events = undefined;

        x._source.offres.forEach((o) => {
          if (romes.some((item) => o.romes.includes(item)) && o.statut === "Active") {
            offres.push(o);
          }
        });
        x._source.offres = offres;
        return x;
      });

      return res.json(filtered);
    })
  );

  return router;
};
