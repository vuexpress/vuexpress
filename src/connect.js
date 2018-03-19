// @flow
import type {RenderOptions, VueRendererOptionParams} from './type';

const path = require('path');
const rendererFactory = require('./renderer/factory');
const ErrorTypes = require('./error');

const noop = () => {
};

function vueRenderer(baseOptions: VueRendererOptionParams) {
  const errorHandler = (e: ErrorTypes.BaseError) => {
    if (baseOptions && baseOptions.onError) {
      baseOptions.onError(e);
    } else {
      console.error(e); // eslint-disable-line no-console
    }
  };
  const readyHandler = (baseOptions && baseOptions.onReady) || noop;

  const basePath = baseOptions.views;
  const renderer = rendererFactory(baseOptions);

  renderer.on('error', errorHandler);
  renderer.on('ready', readyHandler);

  return (req: Object, res: Object, next: Function): void => {
    const url: string = req.originalUrl;
    res.render = (vueFilePath: string, state?: Object, options?: RenderOptions): Promise<void> => {
      vueFilePath = vueFilePath + '.vue';
      res.set('Content-Type', 'text/html');
      const filePath = path.resolve(basePath, vueFilePath);
      const renderOptions = Object.assign({}, {url}, options);
      return renderer.renderToStream(filePath, state, renderOptions).then((stream) => {
        stream.on('data', chunk => res.write(chunk));
        // trigger callback if set
        if(baseOptions.beforeEndCallback) {
          baseOptions.beforeEndCallback(stream, res);
        }
        stream.on('end', () => res.end());
      }).catch((e) => {
        const error = new ErrorTypes.RenderError(e);
        error.component = vueFilePath;
        error.state = state;
        errorHandler(error);
        next(error);
      });
    };
    res.renderToStream = (vueFilePath: string, state?: Object, options?: RenderOptions): Promise<stream$Readable> => {
      vueFilePath = vueFilePath + '.vue';
      const filePath = path.resolve(basePath, vueFilePath);
      const renderOptions = Object.assign({}, {url}, options);
      return renderer.renderToStream(filePath, state, renderOptions);
    };
    res.renderToString = (vueFilePath: string, state?: Object, options?: RenderOptions): Promise<string> => {
      vueFilePath = vueFilePath + '.vue';
      const renderOptions = Object.assign({}, {url}, options);
      const filePath = path.resolve(basePath, vueFilePath);
      return renderer.renderToString(filePath, state, renderOptions);
    };
    return next();
  };
}

module.exports = vueRenderer;
