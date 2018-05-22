// @flow
import typeof FileSystem from 'fs';

export type CompilerOptions = {
  config: Object,
  compilerConfigCallback: ?Function,
  watchCallback: ?Function,
  watchCleanUp: Boolean,
  metaInfo: Object,
  sassResources: string,
  basePath: string,
  watch: boolean,
  cache: boolean,
  extractCSS: boolean,
  globals: Object,
  outputPath: string,
  cssOutputPath: string,
  publicPath: string,
};

export type CompilerOptionParams = {
  config?: Object,
  basePath?: string,
  watch?: boolean,
  extractCSS?: boolean,
  global?: Object,
  metaInfo: Object,
  outputPath?: string
};

export interface ICompiler {
  constructor(fs: FileSystem, compilerOptions: CompilerOptionParams): void;

  import(request: string, options: Object): Promise<any>;

  load(requests: Array<string>): Promise<void>;

  compiledCSS: string;
}

export type RendererOptions = {
  metaInfo: Object,
  plugins: Array<string | Object>,
  preCompile: Array<string>,
  globals: Object
};

export type RendererOptionParams = {
  metaInfo: ?Object,
  plugins: ?Array<string | Object>,
  mixins: ?Array<Object>,
  preCompile: ?Array<string>,
  globals?: Object
};

export type RendererContext = {
  state: Object,
  url: string
}

export type RenderOptions = {
  url: string,
  plain: boolean,
  inlineCSS: boolean,
}

export type MetaOptions = {
  htmlAttrs: IMetaOptions,
  meta: IMetaOptions,
  title: IMetaOptions,
  link: IMetaOptions,
  style: IMetaOptions,
  script: IMetaOptions,
  noscript: IMetaOptions,
  bodyAttrs: IMetaOptions,
}

export interface IMetaOptions {
  text(options: any): string;
}

export interface IRenderer {
  constructor(compiler: ICompiler, options: RendererOptionParams): void;

  renderToStream(path: string, state: Object, options: RenderOptions): Promise<stream$Readable>;

  renderToString(path: string, state: Object, options: RenderOptions): Promise<string>;
}

export type VueRendererOptionParams = {
  metaInfo?: Object,
  compilerConfig?: Object,
  preCompile?: Array<string>,
  plugins?: Array<string | Object>,
  watch?: boolean,
  outputPath?: string,
  views: string,
  globals?: Object,
  onReady: () => void,
  onError: (e: Object) => void,
  beforeEndCallback: ?Function
}

