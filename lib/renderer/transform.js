const stream = require('stream');

/**
 * convert render stream, add html head and tail
 *
 * @class RenderStreamTransform
 * @extends {stream.Transform}
 */
class RenderStreamTransform extends stream.Transform {

  /**
   * Creates an instance of RenderStreamTransform.
   *
   * @param {string} head
   * @param {string} tail
   * @param {Object} [options]
   *
   * @memberOf RenderStreamTransform
   */
  constructor(head, tail, options) {
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
  _transform(chunk, encoding, callback) {
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
  end() {
    this.push(new Buffer(this.tail));
    this.push(null);
  }
}

module.exports = RenderStreamTransform;