const path = require('path');
const MemoryFS = require('memory-fs');
const Compiler = require('../renderer/compiler');
const Renderer = require('../renderer/renderer');

const mfs = new MemoryFS();

const defaultOptions = {
    head: {},
    compilerConfig: {},
    preCompile: [],
    plugins: [],
    watch: false,
    outputPath: '/tmp/vuexpress_ssr',
    global: Object.create(null),
};

/**
 * Get renderer
 *
 * @param {string} basePath
 * @param {Object} vOptions
 * @returns
 */
function rendererFactory(basePath, vOptions) {
    const options = Object.assign({}, defaultOptions, vOptions);
    options.preCompile = options.preCompile.map(filePath => path.resolve(basePath, filePath));

    const compilerOptions = {
        config: options.compilerConfig,
        basePath: path.resolve(basePath),
        watch: options.watch,
        globals: options.globals,
        outputPath: options.outputPath,
        cssOutputPath: options.cssOutputPath,
        publicPath: options.publicPath,
        cache: options.cache,
    };
    const compiler = new Compiler(mfs, compilerOptions);

    const rendererOptions = {
        head: options.head,
        plugins: options.plugins,
        preCompile: options.preCompile,
        globals: options.globals,
    };
    const renderer = new Renderer(compiler, rendererOptions);

    return renderer;
}

module.exports = rendererFactory;
