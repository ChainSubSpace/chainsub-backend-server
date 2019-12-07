const config = { model: "post", plugin: "blog" };

const readingTime = text => {
  const WORDS_PER_MINUTE = 200;
  const result = {};

  const regex = /\w+/g;
  result.wordCount = (text || "").match(regex).length;

  result.readingTime = Math.ceil(result.wordCount / WORDS_PER_MINUTE);
  return result;
};

module.exports = {
  async find(ctx, next, populate) {
    console.log(ctx.query);
    const data = await strapi.plugins[config.plugin].services.database.fetchAll(
      ctx.query,
      populate,
      config
    );
    ctx.send(data);
  },
  async findOne(ctx) {
    const { id } = ctx.params;

    const data = await strapi.plugins[config.plugin].services.database.fetch(
      id,
      config
    );

    ctx.send(data);
  },
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return null;

    ctx.request.body.author = user.userData.id;
    ctx.request.body.tags = ["5dcb2f933e0a9212cc79ccb5"];

    const data = await strapi.plugins[config.plugin].services.database.add(
      ctx.request.body,
      config
    );

    if (data) strapi.hook["turtle-coin"].addPostWallet(data.id);
    ctx.send(data);
  },
  async update(ctx) {
    const user = ctx.state.user;
    if (!user) return null;

    const object = ctx.request.body;
    const { id } = ctx.params;

    if (object.turtleWallet || object.Credentials) {
      strapi.log.error(`${user.username} - Come On :)`);
      return null
    }

    try {
      const { author } = await strapi.query("post", "blog").model.findById(id);

      if (user.userData.id !== author.toString()) {
        strapi.log.error(`${user.username} is trying to hack the system`);
        return null
      }
    } catch (error) {
      return null
    }

    object.author = user.userData.id;

    const updateObject = { ...object, ...readingTime(object.content) };

    const data = await strapi.plugins[config.plugin].services.database.edit(
      updateObject,
      { ...config, params: ctx.params }
    );

    ctx.send(data);
  }
};
