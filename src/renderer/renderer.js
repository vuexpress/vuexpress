// @flow
import type {
  ICompiler,
  IRenderer,
  MetaOptions,
  RendererOptions,
  RendererOptionParams,
  RendererContext,
  RenderOptions
} from '../type';

const EventEmitter = require('events');
const Vue = require('vue');
const Vuex = require('vuex');
const vueServerRenderer = require('vue-server-renderer');
const SSRPlugin = require('../plugins/server');
const StreamTransform = require('./transform');
const ErrorTypes = require('../error');
// $flow-disable-line
const Meta = require('vue-meta');

// $flow-disable-line
Vue.use(Meta, {
  keyName: 'metaInfo', // the component option name that vue-meta looks for meta info on.
  attribute: 'data-vuexpress-meta', // the attribute name vue-meta adds to the tags it observes
  ssrAttribute: 'data-vuexpress-meta-ssr', // the attribute name that lets vue-meta know that meta info has already been server-rendered
  tagIDKeyName: 'vuexpress' // the property name that vue-meta uses to determine whether to overwrite or append a tag
});

Vue.use(SSRPlugin);
Vue.use(Vuex);

const defaultRendererOptions: RendererOptions = {
  metaInfo: Object.create(null),
  plugins: [],
  mixins: [],
  preCompile: [],
  globals: Object.create(null),
};

class Renderer extends EventEmitter implements IRenderer {
  compiler: ICompiler;
  options: RendererOptions;
  ready: boolean;
  Vue: Class<Vue>;
  vueRenderer: *;

  /**
   * Creates an instance of Renderer.
   * @param {ICompiler} compiler
   * @param {RendererOptionParams} options
   * @memberof Renderer
   */
  constructor(compiler: ICompiler, options?: RendererOptionParams) {
    super();
    this.compiler = compiler;
    this.vueRenderer = vueServerRenderer.createRenderer();
    this.options = Object.assign({}, defaultRendererOptions, options);
    this.options.mixins.forEach((mixin)=>{
      Vue.mixin(mixin);
    });
    this.init();
  }

  /**
   *
   *
   * @memberof Renderer
   */
  init(): void {
    const needCompiledPlugin: Array<string> = [];
    this.options.plugins.forEach((plugin) => {
      if (typeof plugin === 'string') {
        needCompiledPlugin.push(plugin);
      }
    });
    this.options.preCompile.push(...needCompiledPlugin);
    this.compiler.load(this.options.preCompile).then(() => {
      this.emit('ready');
    }).catch((e) => {
      const error = new ErrorTypes.BaseError(e);
      this.emit('error', error);
    });
  }

  /**
   *
   *
   * @returns {Promise<Class<Vue>>}
   * @memberof Renderer
   */
  getVueClass(): Promise<Class<Vue>> {
    if (this.Vue) return Promise.resolve(this.Vue);

    const needCompiledPlugins: Array<string> = [];
    this.options.plugins.forEach((plugin) => {
      if (typeof plugin === 'string') {
        needCompiledPlugins.push(plugin);
      } else if (plugin.default && plugin.default.install) {
        Vue.use(plugin.default);
      } else {
        Vue.use(plugin);
      }
    });

    if (needCompiledPlugins.length === 0) {
      this.Vue = Vue;
      return Promise.resolve(this.Vue);
    }

    return Promise.all(needCompiledPlugins.map(pluginPath => this.compiler.import(pluginPath, options)))
      .then((plugins) => {
        plugins.forEach((plugin) => {
          if (plugin.default && plugin.default.install) {
            Vue.use(plugin.default);
          } else {
            Vue.use(plugin);
          }
        });
        this.Vue = Vue;
        return this.Vue;
      });
  }

  /**
   * get the component
   *
   * @param path
   * @param context
   * @param requestOptions
   * @returns {Promise<*[]>}
   */
  getComponent(path: string, context: RendererContext, requestOptions: Object): Promise<Vue> {
    return Promise.all([
      this.getVueClass(),
      this.compiler.import(path, requestOptions).then(object => object.default || object),
    ]).then(([VueClass, VueOptions]) => {
      const SSRVueOptions = Object.assign({}, VueOptions, {$context: context});
      const component = new VueClass(SSRVueOptions);

      return component;
    });
  }

  /**
   *
   *
   * @param {string} path
   * @param {Object} state
   * @param {RenderOptions} options
   * @returns {Promise<stream$Readable>}
   * @memberof Renderer
   */
  renderToStream(path: string, state?: Object, options?: RenderOptions): Promise<stream$Readable> {
    const context: RendererContext = {
      state: state || {},
      url: options ? options.url : '/',
    };
    const isPlain = typeof options.plain === "undefined" ? false : options.plain;
    const inlineCSS = typeof options.inlineCSS === "undefined" ? false : options.inlineCSS;
    const requestOptions = {
      isPlain: isPlain,
      inlineCSS: inlineCSS,
    };

    return this.getComponent(path, context, requestOptions).then((component) => {
      const bodyStream = this.vueRenderer.renderToStream(component);
      bodyStream.on('error', (e) => {
        let error;
        if (e instanceof ErrorTypes.CompilerError) {
          error = e;
        } else {
          error = new ErrorTypes.RenderError(e);
          error.component = path;
          error.state = state;
        }
        this.emit('error', error);
      });

      if (inlineCSS) {
        bodyStream.push(new Buffer(`<style type="text/css">${this.compiler.compiledCSS}</style>`));
      }

      if (isPlain) {
        return bodyStream;
      }

      // $flow-disable-line
      component.$options.metaInfo = Object.assign({}, this.compiler.options.metaInfo, component.$options.metaInfo);

      // $flow-disable-line
      const template = Renderer.getTemplateHtml(component.$meta().inject(), context.state, this.options.globals);
      const transform = new StreamTransform(template.head, template.tail);
      return bodyStream.pipe(transform);
    });
  }

  renderToString(path: string, state?: Object, options?: RenderOptions): Promise<string> {
    const context: RendererContext = {
      state: state || {},
      url: options ? options.url : '/',
    };
    const isPlain = typeof options.plain === "undefined" ? false : options.plain;
    const inlineCSS = typeof options.inlineCSS === "undefined" ? false : options.inlineCSS;
    const requestOptions = {
      isPlain: isPlain,
      inlineCSS: inlineCSS,
    };

    return this.getComponent(path, context, requestOptions).then(component => new Promise((resolve, reject) => {
      this.vueRenderer.renderToString(component, (e, result) => {
        if (e) {
          e.component = path;
          reject(e);
          return;
        }

        if (inlineCSS) {
          result = `<style type="text/css">${this.compiler.compiledCSS}</style>` + result;
        }

        if (isPlain) {
          resolve(result);
          return;
        }

        // $flow-disable-line
        component.$options.metaInfo = Object.assign({}, this.compiler.options.metaInfo, component.$options.metaInfo);
        // $flow-disable-line
        const indexHtml = Renderer.getTemplateHtml(component.$meta().inject(), context.state, this.options.globals);
        const html = `${indexHtml.head}${result}${indexHtml.tail}`;
        resolve(html);
      });
    }));
  }

  /**
   * @static
   * @param {Object}
   * @param {Object} state
   * @returns {{ head: string, tail: string }}
   * @memberof Renderer
   */
  static getTemplateHtml(metaData: MetaOptions, state: Object, globalVars: Object): { head: string, tail: string } {
    const bodyOpt = {body: true};

    const {title, htmlAttrs, bodyAttrs, link, style, script, noscript, meta} = metaData;

    // $flow-disable-line
    const head = `<!DOCTYPE html>
<html ${htmlAttrs.text()}>
<head>
${meta.text()}
${title.text()}
${link.text()}
${style.text()}
${script.text()}
${noscript.text()}
</head>
<body ${bodyAttrs.text()}>
  `;

    const tail = `
${script.text(bodyOpt)}</body>
</html>`;

    return {head, tail};
  }
}

module.exports = Renderer;
