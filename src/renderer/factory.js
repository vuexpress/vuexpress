// @flow
import type {RendererOptionParams, CompilerOptionParams, VueRendererOptionParams} from '../type';

const fs = require('fs');
const path = require('path');
const MemoryFS = require('memory-fs');
const Compiler = require('../renderer/compiler');
const Renderer = require('../renderer/renderer');
const recursiveReadSync = require('recursive-readdir-sync');
const mfs = new MemoryFS();

const defaultOptions = {
  metaInfo: {},
  compilerConfig: {},
  compilerConfigCallback: null,
  preCompile: [],
  plugins: [],
  mixins: [],
  sassResources: '',
  watch: false,
  watchCallback: null,
  watchCleanUp: true,
  beforeEndCallback: null,
  extractCSS: true,
  cache: true,
  cssOutputPath: 'css/style.css',
  publicPath: './public',
  views: './views',
  outputPath: '/tmp/vuexpress_ssr',
  globals: Object.create(null),
};

/**
 * Get renderer
 *
 * @param {Object} vOptions
 * @returns
 */
function rendererFactory(vOptions?: VueRendererOptionParams): Renderer {
  const options = Object.assign({}, defaultOptions, vOptions);
  const basePath = options.views;
  options.preCompile = options.preCompile.map(filePath => path.resolve(basePath, filePath));

  if(options.watch === false) {
    let files = recursiveReadSync(path.resolve(basePath));
    files = files.filter((file)=>{
      return file.match(/\.vue$/i);
    });
    options.preCompile = options.preCompile.concat(files);
  }

  const compilerOptions = {
    config: options.compilerConfig,
    configCallback: options.compilerConfigCallback,
    basePath: path.resolve(basePath),
    watch: options.watch,
    watchCallback: options.watchCallback,
    watchCleanUp: options.watchCleanUp,
    globals: options.globals,
    outputPath: options.outputPath,
    sassResources: options.sassResources,
    cssOutputPath: options.cssOutputPath,
    publicPath: options.publicPath,
    cache: options.cache,
    extractCSS: options.extractCSS,
    metaInfo: options.metaInfo,
  };

  const compiler = new Compiler(mfs, compilerOptions);

  const rendererOptions: RendererOptionParams = {
    metaInfo: options.metaInfo,
    plugins: options.plugins,
    mixins: options.mixins,
    beforeEndCallback: options.beforeEndCallback,
    preCompile: options.preCompile,
    globals: options.globals,
  };
  const renderer = new Renderer(compiler, rendererOptions);

  return renderer;
}

module.exports = rendererFactory;
