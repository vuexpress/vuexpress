/**
 * Renderer base error
 *
 * @class RendererError
 * @extends {Error}
 */
class BaseError extends Error {
  type: string;
  name: string;

  constructor(e: ?Error) {
    if (e instanceof BaseError) return e;
    super();
    this.type = 'Error';
    this.name = 'VueRendererError';
    if (e) {
      this.stack = e.stack;
      this.message = e.message;
    }
  }
}

/**
 * render error
 *
 * @class RenderError
 * @extends {RendererError}
 */
class RenderError extends BaseError {
  type: string;
  state: ?Object;
  component: string;

  constructor(e: ?Error): void {
    super(e);
    this.type = 'RenderError';
  }
}

/**
 * render error
 *
 * @class RenderError
 * @extends {RendererError}
 */
class CompilerError extends BaseError {
  type: string;
  errors: ?Array<string>;

  constructor(e: ?Error): void {
    super(e);
    this.type = 'RenderError';
  }
}

module.exports = {
  BaseError,
  RenderError,
  CompilerError,
};
