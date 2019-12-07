'use strict';

const slugify = require('slugify');

module.exports = {
  beforeSave: async model => {
    if (model.name) {
      model.slug = slugify(model.name);
    }
  },
  beforeUpdate: async model => {
    if (model.getUpdate().name) {
      model.update({
        slug: slugify(model.getUpdate().name),
      });
    }
  },
};
