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
  preCompile: [],
  preCompileAll: true,
  plugins: [],
  watch: false,
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

  if(options.preCompileAll === true) {
    let files = recursiveReadSync(path.resolve(basePath));
    files = files.filter((file)=>{
      return file.match(/\.vue$/i);
    });
    options.preCompile = options.preCompile.concat(files);
  }

  const compilerOptions = {
    config: options.compilerConfig,
    basePath: path.resolve(basePath),
    watch: options.watch,
    globals: options.globals,
    outputPath: options.outputPath,
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
    preCompile: options.preCompile,
    preCompileAll: options.preCompileAll,
    globals: options.globals,
  };
  const renderer = new Renderer(compiler, rendererOptions);

  return renderer;
}

module.exports = rendererFactory;
