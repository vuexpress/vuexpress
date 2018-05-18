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
                example: 'Hello World 123',
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

            font-size: 16px;
            font-weight: bold;
      color: black;

    }
    :root {
      --red: #d33;
    }
    a {
      &:hover {
        color: color(var(--red) a(54%));
      }
    }
  ::placeholder {
    color:red;
  }
</style>
