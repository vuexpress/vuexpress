// @flow

const stream = require('stream');

/**
 * convert render stream, add html head and tail
 *
 * @class RenderStreamTransform
 * @extends {stream.Transform}
 */
class RenderStreamTransform extends stream.Transform {
  head: string;
  tail: string;
  firstFlag: boolean;

  /**
   * Creates an instance of RenderStreamTransform.
   *
   * @param {string} head
   * @param {string} tail
   * @param {Object} [options]
   *
   * @memberOf RenderStreamTransform
   */
  constructor(head: string, tail: string, options: any) {
    super(options);
    this.head = head;
    this.tail = tail;
    this.firstFlag = true;
  }

  /**
   * override Transform._transform()
   *
   * @override
   * @param { string | Buffer} chunk
   * @param {string} encoding
   * @param {Function} callback
   *
   * @memberOf RenderStreamTransform
   */
  _transform(chunk: string | Buffer, encoding: string, callback: Function): void {
    if (this.firstFlag) {
      this.push(new Buffer(this.head));
      this.firstFlag = false;
    }
    this.push(chunk);
    callback();
  }

  /**
   * override Transform.end
   *
   * @override
   * @memberOf RenderStreamTransform
   */
  end(): void {
    this.push(new Buffer(this.tail));
    this.push(null);
  }
}

module.exports = RenderStreamTransform;
