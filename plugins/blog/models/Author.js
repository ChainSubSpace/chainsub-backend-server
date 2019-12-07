'use strict';

const slugify = require('slugify');
const _ = require('lodash');

module.exports = {
  beforeSave: async model => {
    if (model.username) {
      model.slug = slugify(model.username);
    }
  },
  beforeUpdate: async model => {
    if (model.getUpdate().username) {
      model.update({
        slug: slugify(model.getUpdate().username),
      });
    }
  },

  afterFetchAll: async (model, results) => {
    strapi.log.debug('/models/User.js afterFetchAll Event');

    results = await Promise.all(results.map(async result => {
      if (!result.turtleWallet) return;
      const id = (result.turtleWallet.address) ? result.turtleWallet.id : result.turtleWallet;
      const wallet = await strapi.query('turtlewallet', 'crypto').findOne({id});
      result['virtualTurtleWallet'] = wallet.address;
      return Promise.resolve(result);
    }));
  }
};
