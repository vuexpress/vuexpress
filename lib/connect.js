

const path = require('path');

const rendererFactory = require('./renderer/factory');
const ErrorTypes = require('./error');

const noop = () => {};

function vueRenderer(baseOptions) {
  const errorHandler = e => {
    if (baseOptions && baseOptions.onError) {
      baseOptions.onError(e);
    } else {
      console.error(e); // eslint-disable-line no-console
    }
  };
  const readyHandler = baseOptions && baseOptions.onReady || noop;

  const basePath = baseOptions.views;
  const renderer = rendererFactory(baseOptions);

  renderer.on('error', errorHandler);
  renderer.on('ready', readyHandler);

  return (req, res, next) => {
    const url = req.originalUrl;
    res.render = (vueFilePath, state, options) => {
      vueFilePath = vueFilePath + '.vue';
      res.set('Content-Type', 'text/html');
      const filePath = path.resolve(basePath, vueFilePath);
      const renderOptions = Object.assign({}, { url }, options);
      return renderer.renderToStream(filePath, state, renderOptions).then(stream => {
        stream.on('data', chunk => res.write(chunk));
        stream.on('end', () => res.end());
      }).catch(e => {
        const error = new ErrorTypes.RenderError(e);
        error.component = vueFilePath;
        error.state = state;
        errorHandler(error);
        next(error);
      });
    };
    res.renderToStream = (vueFilePath, state, options) => {
      vueFilePath = vueFilePath + '.vue';
      const filePath = path.resolve(basePath, vueFilePath);
      const renderOptions = Object.assign({}, { url }, options);
      return renderer.renderToStream(filePath, state, renderOptions);
    };
    res.renderToString = (vueFilePath, state, options) => {
      vueFilePath = vueFilePath + '.vue';
      const renderOptions = Object.assign({}, { url }, options);
      const filePath = path.resolve(basePath, vueFilePath);
      return renderer.renderToString(filePath, state, renderOptions);
    };
    return next();
  };
}

module.exports = vueRenderer;