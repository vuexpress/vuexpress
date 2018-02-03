const path = require('path');
const vm = require('vm');
const filesystem = require('fs');
const webpack = require('webpack');
const nodeVersion = require('node-version');
const nodeExternals = require('webpack-node-externals');
const webpackMerge = require('webpack-merge');
const ErrorTypes = require('../error');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const cacheMap = new Map();
const compilingWaitingQueueMap = new Map();

const defaultOptions = {
    basePath: __dirname,
    watch: false,
    globals: Object.create(null),
    config: Object.create(null),
    outputPath: '/tmp/vuexpress_ssr',
    cssOutputPath: 'style.css',
    publicPath: 'public',
    cache: true,
};

/**
 * Compiler Class
 *
 * @class Compiler
 * @implements {ICompiler}
 */
class Compiler {

    constructor(fs, options) {
        this.options = Object.assign({}, defaultOptions, options);
        this.fs = fs;
        this.head = {
            link: []
        };
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
    import(request) {
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
    compile(filePaths) {
        const fileMap = new Map();
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
    load(filePaths) {
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
                        filesystem.writeFileSync(this.options.publicPath + '/' + this.options.cssOutputPath, data);
                        this.head.link.push({ rel: 'stylesheet', href: this.options.cssOutputPath });
                    }

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
    getObject(sourceFile) {
        const sandboxGlobal = Object.assign({}, defaultOptions.globals, {module, require}, this.options.globals);
        const sandbox = vm.createContext(sandboxGlobal);
        return vm.runInContext(sourceFile, sandbox);
    }

    getLoaders() {
        function generateLoaders(loader, loaderOptions) {
            let loaders = [
                'css-loader'
            ];
            if (loader) {
                loaders.push({
                    loader: loader + '-loader',
                    options: Object.assign({}, loaderOptions, {
                        sourceMap: false
                    })
                })
            }
            return ExtractTextPlugin.extract({
                use: loaders,
                fallback: 'vue-style-loader'
            })
        }

        return {
            css: generateLoaders(),
            sass: generateLoaders('sass', {indentedSyntax: true}),
            scss: generateLoaders('sass'),
        }
    }

    /**
     * get webpack config
     *
     * @param {Map<string, string>} fileMap
     * @returns {Object}
     * @memberof Compiler
     */
    getConfig(fileMap) {

        const entry = Object.create(null);
        [...fileMap.entries()].forEach(([fileName, filePath]) => {
            entry[fileName] = [filePath];
        });

        let loaders = Object.assign(this.getLoaders(), {
            js: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['env', {targets: {node: Number(nodeVersion.major)}}],
                    ],
                    plugins: ['transform-object-rest-spread'],
                    babelrc: false,
                },
            }
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
                rules: [{
                    test: /\.vue$/,
                    use: {
                        loader: 'vue-loader',
                        options: {
                            loaders: loaders,
                            extractCSS: true
                        },
                    },
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
                }],
            },
            externals: [nodeExternals()],
            context: this.options.basePath,
            plugins: [
                new ExtractTextPlugin("style.css"),
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                    'process.env.VUE_ENV': '"server"',
                }),
                new webpack.LoaderOptionsPlugin({
                    debug: true
                })
            ],
        };

        return webpackMerge.smart(defaultConfig, this.options.config);
    }

    /**
     * get file name by path
     *
     * @static
     * @param {string} filePath
     * @returns {string}
     * @memberof Compiler
     */
    static getFileNameByPath(filePath) {
        const pathHexStr = (new Buffer(filePath)).toString('hex');
        return `${path.basename(filePath)}.${pathHexStr}`;
    }
}

Compiler.cacheMap = cacheMap;

module.exports = Compiler;