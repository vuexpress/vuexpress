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
        #app {
            font-size: 16px;
            font-weight: bold;
        }
    }
</style>
