"use strict";

const _ = require("lodash");
const { sanitizeEntity } = require("strapi-utils");

const sanitizeData = (data, model, plugin) =>
  sanitizeEntity(data, { model: strapi.query(model, plugin).model });

module.exports = {
  async fetchAll(query, { populate } = {}, { model, plugin }) {
    let data;

    if (_.has(query, "_q")) {
      data = await strapi.query(model, plugin).search(query, populate);
    } else {
      data = await strapi.query(model, plugin).find(query, populate);
    }

    return data.map(data => sanitizeData(data, model, plugin));
  },
  async fetch(id, { model, plugin }) {
    let data = null;
    try {
      data = await strapi.query(model, plugin).findOne({ id });
    } catch (error) {
      strapi.log.debug(error);
    }

    return data ? sanitizeData(data, model, plugin) : false;
  },
  async add(object, { model, plugin }) {
    return strapi.query(model, plugin).create(object);
  },
  async edit(ctx, { model, plugin }) {
    let data;

    data = await strapi
      .query(model, plugin)
      .update(ctx.params, ctx.request.body);
    return data ? sanitizeData(data, model, plugin) : false;
  },
  async findAndUpdate(query, object, { model, plugin }) {
    let data;

    try {
      const item = await strapi.query(model, plugin).findOne(query);
      if (!item)
        throw new Error(
          `item not found: model: ${model} query: ${JSON.stringify(query)}`
        );
      data = await strapi.query(model, plugin).update({ id: item.id }, object);
    } catch (error) {
      strapi.log.error(error);
    }

    return data ? sanitizeData(data, model, plugin) : false;
  }
};
