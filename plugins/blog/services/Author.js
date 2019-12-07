'use strict';

const _ = require('lodash');
const {ApolloError} = require('apollo-server-koa');

module.exports = {
  checkBadRequest(contextBody) {
    if (_.get(contextBody, 'output.payload.statusCode', 200) !== 200) {
      const statusCode = _.get(contextBody, 'output.payload.statusCode', 400);
      const message = _.get(contextBody, 'output.payload.message', 'Bad Request');
      throw new ApolloError(message, statusCode, _.omit(contextBody, ['output']));
    }
  },

  isAuthenticated(context) {
    const user = context.state.user;
    if (user) return true;

    const error = [context.badRequest(null, [
      {messages: [{id: 'No authorization header was found'}]},
    ])];

    this.checkBadRequest(error);
  }
};
