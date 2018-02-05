// @flow
process.env.VUE_ENV = 'server';

const vueRenderer = require('./connect');
const ErrorTypes = require('./error');

module.exports = {
  vueRenderer,
  ErrorTypes,
};
