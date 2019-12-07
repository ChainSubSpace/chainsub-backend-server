'use strict';

const _ = require('lodash');
const {sanitizeEntity} = require('strapi-utils');

const sanitizeData = (data, model, plugin) =>
  sanitizeEntity(data, {model: strapi.query(model, plugin).model});

module.exports = {
  async fetchAll(query, {populate} = {}, {model, plugin}) {
    let data;

    if (_.has(query, '_q')) {
      data = await strapi.query(model, plugin).search(query, populate);
    } else {
      data = await strapi.query(model, plugin).find(query, populate);
    }

    return data.map(data => sanitizeData(data, model, plugin));
  },
  async fetch(id, {model, plugin}) {
    let data = null;

    try {
      data = await strapi.query(model, plugin).findOne({id});
    } catch (error) {
      strapi.log.debug(error);
    }

    return (data) ? sanitizeData(data, model, plugin) : false;
  },
  async add(object, {model, plugin}) {
    const data = await strapi.query(model, plugin).create(object);
    return (data) ? sanitizeData(data, model, plugin) : false;
  },
  async edit(object, {model, plugin, params}) {
    let data;

    data = await strapi.query(model, plugin).update(params, object);
    return (data) ? sanitizeData(data, model, plugin) : false;
  }
};