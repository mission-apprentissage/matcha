/* eslint-disable node/no-unpublished-require */
const axiosist = require("axiosist");
const createComponents = require("../../src/common/components/components");
const { connectToMongoForTests, cleanAll } = require("./testUtils.js");
const server = require("../../src/http/server");

const startServer = async (options = {}) => {
  const { db } = await connectToMongoForTests();
  const components = await createComponents({ db });
  const app = await server(components);
  const httpClient = axiosist(app);

  return {
    httpClient,
    components,
    createAndLogUser: async (name, surname, parcoursup_id, email, phone, password, options) => {
      await components.users.createUser(name, surname, parcoursup_id, email, phone, password, options);

      const response = await httpClient.post("/api/login", {
        username: email,
        password: password,
      });

      return {
        Authorization: "Bearer " + response.data.token,
      };
    },
  };
};

module.exports = (desc, cb) => {
  describe(desc, function () {
    cb({ startServer });
    afterEach(cleanAll);
  });
};
