// @flow
import type _Vue from 'vue';

const SSRServerPlugin = {
  install(Vue: Class<_Vue>): void {
    Vue.mixin({
      beforeCreate(): void {
        if (this.$parent) return;
        const context = this.$options.$context;
        if (!context) return;
        Object.keys(this.$options).forEach((key) => {
          if (typeof this.$options[key].$ssrInstance === 'function') {
            this.$options[key] = this.$options[key].$ssrInstance();
          }
        });
        if (this.$options.store === undefined) {
          const data = typeof this.$options.data === 'function' ?
            this.$options.data.call(this) :
            this.$options.data || {};
          this.$options.data = Object.assign({}, data, context.state);
        } else {
          const store = this.$options.store;
          store.replaceState(Object.assign({}, store.state, context.state));
        }
        if (this.$options.router !== undefined) {
          this.$options.router.push(context.url);
        }
      },
    });
  },
};

module.exports = SSRServerPlugin;
