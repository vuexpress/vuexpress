/**
 * Renderer base error
 *
 * @class RendererError
 * @extends {Error}
 */
class BaseError extends Error {

  constructor(e) {
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

  constructor(e) {
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

  constructor(e) {
    super(e);
    this.type = 'RenderError';
  }
}

module.exports = {
  BaseError,
  RenderError,
  CompilerError
};