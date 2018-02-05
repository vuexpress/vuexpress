const vueRenderer = {};
vueRenderer.install = (Vue, options) => {
  Vue.mixin({
    beforeCreate() {
      if (this.$isServer || this.$parent) return;
      const initState = window.__VUE_INITIAL_STATE__; //eslint-disable-line
      if (this.$options.store && initState) {
        this.$options.store.replaceState(Object.assign({}, this.$options.store.state, initState));
      } else {
        const data = typeof this.$options.data === 'function' ? this.$options.data.call(this) : this.$options.data || {};
        this.$options.data = Object.assign({}, data, initState);
      }
    }
  });
};

module.exports = vueRenderer;