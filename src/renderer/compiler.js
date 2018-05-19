// @flow
import typeof FileSystem from 'fs';
import type {ICompiler, CompilerOptions, CompilerOptionParams} from '../type';

const path = require('path');
const vm = require('vm');
const filesystem = require('fs');
const webpack = require('webpack');
const nodeVersion = require('node-version');
const webpackMerge = require('webpack-merge');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const ErrorTypes = require('../error');
const nodeExternals = require('webpack-node-externals');
// $flow-disable-line
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const cacheMap: Map<string, any> = new Map();
const compilingWaitingQueueMap: Map<string, Array<{
  resolve: (result: any) => void,
  reject: (e: any) => void
}>> = new Map();

const defaultOptions: CompilerOptions = {
  basePath: __dirname,
  watch: false,
  globals: Object.create(null),
  config: Object.create(null),
  compilerConfigCallback: null,
  watchCallback: null,
  metaInfo: {
    link: [],
    style: [],
  },
  sassResources: '',
  outputPath: '/tmp/vuexpress_ssr',
  cssOutputPath: 'style.css',
  publicPath: 'public',
  cache: true,
  extractCSS: true,
};

/**
 * Compiler Class
 *
 * @class Compiler
 * @implements {ICompiler}
 */
class Compiler implements ICompiler {
  static cacheMap: Map<string, any>;
  fs: FileSystem;
  compiledCSS: string;
  options: CompilerOptions;

  constructor(fs: FileSystem, options?: CompilerOptionParams) {
    this.options = Object.assign({}, defaultOptions, options);
    this.fs = fs;

    delete this.options.config.output;
  }

  /**
   * dynamic import
   * e.g.
   * const component = await compiler.import('component.vue');
   *
   * @param {string} request
   * @returns {Promise<any>}
   * @memberof Compiler
   */
  import(request: string): Promise<any> {
    if (this.options.cache && Compiler.cacheMap.has(request)) {
      return Promise.resolve(Compiler.cacheMap.get(request));
    }
    const compilingWaitingQueue = compilingWaitingQueueMap.get(request);
    if (compilingWaitingQueue) {
      return new Promise((resolve, reject) => compilingWaitingQueue.push({resolve, reject}));
    }

    const resultPromise = new Promise((resolve, reject) =>
      compilingWaitingQueueMap.set(request, [{resolve, reject}]));
    return this.load([request]).then(() => resultPromise);
  }

  /**
   * compile file
   *
   * @param {Array<string>} filePaths
   * @returns {Promise<void>}
   * @memberof Compiler
   */
  compile(filePaths: Array<string>): Promise<void> {
    const fileMap: Map<string, string> = new Map();
    filePaths.forEach((filePath) => {
      fileMap.set(Compiler.getFileNameByPath(filePath), filePath);
    });
    const webpackConfig = this.getConfig(fileMap);
    const serverCompiler = webpack(webpackConfig);
    serverCompiler.outputFileSystem = this.fs;
    const runner = this.options.watch
      ? cb => serverCompiler.watch({}, cb)
      : cb => serverCompiler.run(cb);
    return new Promise((resolve, reject) => {
      runner((error, stats) => {
        if (error) {
          reject(new ErrorTypes.CompilerError(error));
          return;
        }

        if(this.options.watch && this.options.watchCallback) {
          this.options.watchCallback(stats);
        }

        const info = stats.toJson();
        if (stats.hasErrors()) {
          const e = new ErrorTypes.CompilerError();
          e.errors = info.errors;
          reject(e);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * load file into cache
   *
   * @param {Array<string>} filePaths
   * @returns {Promise<void>}
   * @memberof Compiler
   */
  load(filePaths: Array<string>): Promise<void> {
    if (filePaths.length === 0) return Promise.resolve();
    filePaths.forEach((filePath) => {
      if (!compilingWaitingQueueMap.has(filePath)) {
        compilingWaitingQueueMap.set(filePath, []);
      }
    });

    return this.compile(filePaths).then(() => Promise.all(filePaths.map(filePath =>
      new Promise((resolve, reject) => {
        const fileName = Compiler.getFileNameByPath(filePath);

        this.fs.readFile(path.normalize(`${this.options.outputPath}/style.css`), (error, data) => {
          if (!error && data) {

            this.compiledCSS = data.toString();

            if (this.options.extractCSS) {
              filesystem.writeFileSync(this.options.publicPath + '/' + this.options.cssOutputPath, this.compiledCSS);

              let styleObj = {rel: 'stylesheet', href: this.options.cssOutputPath};

              if (this.options.metaInfo.link && !this.options.metaInfo.link.find((item) => {
                  return item.href === styleObj.href;
                })) {
                this.options.metaInfo.link.push(styleObj);
              } else if(!this.options.metaInfo.link) {
                this.options.metaInfo.link = [styleObj];
              }
            } else {
              this.options.metaInfo.style.push({type: 'text/css', cssText: this.compiledCSS});
            }
          }

          this.fs.readFile(path.normalize(`${this.options.outputPath}/style.css.map`), (error, data) => {
            if (!error && data) {
              filesystem.writeFileSync(this.options.publicPath + '/' + this.options.cssOutputPath + '.map', data.toString());
            }
          });

          this.fs.readFile(path.normalize(`${this.options.outputPath}/${fileName}.js`), (error, data) => {
            const compilingWaitingQueue = compilingWaitingQueueMap.get(filePath);
            if (error) {
              if (compilingWaitingQueue) {
                compilingWaitingQueue.forEach(callback => callback.reject(error));
              }
              reject(error);
              return;
            }

            const object = this.getObject(data.toString());
            Compiler.cacheMap.set(filePath, object);
            if (compilingWaitingQueue) {
              compilingWaitingQueue.forEach(callback => callback.resolve(object));
            }
            compilingWaitingQueueMap.delete(filePath);
            resolve();
          });
        });

      }))).then());
  }

  /**
   *
   * @param {string} sourceFile
   * @returns {*}
   * @memberof Compiler
   */
  getObject(sourceFile: string): any {
    const sandboxGlobal = Object.assign({}, defaultOptions.globals, {module, require, console}, this.options.globals);
    const sandbox = vm.createContext(sandboxGlobal);
    return vm.runInContext(sourceFile, sandbox);
  }

  /**
   * get webpack config
   *
   * @param {Map<string, string>} fileMap
   * @returns {Object}
   * @memberof Compiler
   */
  getConfig(fileMap: Map<string, string>): Object {

    const entry = Object.create(null);
    [...fileMap.entries()].forEach(([fileName, filePath]) => {
      entry[fileName] = [filePath];
    });

    const defaultConfig = {
      entry,
      target: 'node',
      output: {
        path: this.options.outputPath,
        filename: '[name].js',
        libraryTarget: 'commonjs2',
      },
      module: {
        rules: [
          {
            test: /\.vue$/,
            loader: 'vue-loader'
          },
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['env', {targets: {node: Number(nodeVersion.major)}}],
                ],
                plugins: ['transform-object-rest-spread'],
                babelrc: false,
              },
            },
          },
          {
            test: /\.css$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: { sourceMap: true, importLoaders: 1 }
              },
              {
                loader: 'postcss-loader',
                options: {
                  sourceMap: true,
                  ident: 'postcss',
                  plugins: (loader) => [
                    require('postcss-cssnext')()
                  ]
                }
              }
            ]
          },
          {
            test: /\.scss$/,
            use: [
              MiniCssExtractPlugin.loader,
              {
                loader: 'css-loader',
                options: { sourceMap: true, importLoaders: 1 }
              },
              {
                loader: 'postcss-loader',
                options: {
                  sourceMap: true,
                  ident: 'postcss',
                  plugins: (loader) => [
                    require('postcss-cssnext')()
                  ]
                }
              },
              {
                loader: 'sass-loader',
                options: {
                  data: this.options.sassResources,
                  sourceMap: true
                }
              },
            ]
          }
        ],
      },
      context: this.options.basePath,
      externals: nodeExternals({
        whitelist: [/\.css$/, /\?vue&type=style/]
      }),
      devtool: process.env.NODE_ENV === 'production' ? '' : 'source-map',
      plugins: [
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
          filename: 'style.css'
        }),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.VUE_ENV': '"server"',
        }),
        new webpack.LoaderOptionsPlugin({
          debug: process.env.NODE_ENV === 'development'
        })
      ],
    };

    let webpackMerged = webpackMerge.smart(defaultConfig, this.options.config);

    if(typeof this.options.configCallback === 'function') {
      webpackMerged = this.options.configCallback(webpackMerged);
    }

    return webpackMerged;
  }

  /**
   * get file name by path
   *
   * @static
   * @param {string} filePath
   * @returns {string}
   * @memberof Compiler
   */
  static getFileNameByPath(filePath: string): string {
    const pathHexStr: string = (new Buffer(filePath)).toString('hex');
    return `${path.basename(filePath)}.${pathHexStr}`;
  }
}

Compiler.cacheMap = cacheMap;

module.exports = Compiler;
