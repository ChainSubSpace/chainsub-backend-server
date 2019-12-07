'use strict';

const slugify = require('slugify');
const get = require('lodash/get');

module.exports = {
  beforeSave: async model => {
    if (model.title) {
      model.slug = slugify(model.title);
    }
  },
  beforeUpdate: async model => {
    if (model.getUpdate().title) {
      model.update({
        slug: slugify(model.getUpdate().title),
      });
    }
  },

  afterFetchAll: async (model, results) => {
    strapi.log.debug('/models/Post.js afterFetchAll Event');

    results = await Promise.all(results.map(async result => {
      const wallet = get(result, 'turtleWallet');
      if (!wallet.address) return;
      // const id = (result.turtleWallet.address) ? result.turtleWallet.id : result.turtleWallet;
      // const wallet = await strapi.query('turtlewallet', 'crypto').findOne({id});
      result['virtualTurtleWallet'] = wallet.address;
      result['virtualTurtleTotalReceived'] = wallet.totalReceived;

      return Promise.resolve(result);
    }));
  }
};
