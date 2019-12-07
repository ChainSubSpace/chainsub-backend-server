const config = {model: 'category', plugin: 'blog'};

module.exports = {
  async find(ctx, next, populate) {
    const data = await strapi.plugins[config.plugin].services.database.fetchAll(
      ctx.query,
      populate,
      config
    );

    ctx.send(data);
  },
  async findOne(ctx) {
    const {id} = ctx.params;

    const data = await strapi.plugins[config.plugin].services.database.fetch(
      id,
      config
    );

    ctx.send(data);
  }
};
