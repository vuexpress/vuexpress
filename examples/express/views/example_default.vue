<template>
  <div>
    {{myVar}} {{example}}
  </div>
</template>

<script>
  export default {
    name: 'Example default',
    data() {
      return {
        example: 'Hello World',
      };
    },
    metaInfo: {
      title: 'Default Title',
      titleTemplate: '%s | My Awesome Website'
    },
    created() {},
    methods: {},
    computed: {},
    components: {}
  }
</script>

<style lang="scss">
  body {
    color:black;
  }
</style>
