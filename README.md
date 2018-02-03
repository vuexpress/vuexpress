<p align="center"><img width="100" src="https://i.imgur.com/gVS6Mja.png" alt="Vuexpress - Vue + express.js"></p>

<p align="center">

  <a href="https://www.npmjs.com/package/@doweb/vuexpress"><img src="https://img.shields.io/npm/dm/@doweb/vuexpress.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@doweb/vuexpress"><img src="https://badge.fury.io/js/%40doweb%2Fvuexpress.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@doweb/vuexpress"><img src="https://img.shields.io/npm/l/@doweb/vuexpress.svg" alt="License"></a>

</p>

## Introduction

VueXpress is a template engine for express.js. You can easily rendering *.vue templates on the server. Check out the usage information.

## Usage

File: example.js

```js
const vueRenderer = require('@doweb/vuexpress').vueRenderer;
const express = require('express');
const app = express();

let options = {
    // folder with your views
    views: './views',
    // cache templates
    cache: true,
    // css output folder, extracted styles from your *.vue files
    cssOutputPath: 'css/style.css',
    // path to your web root
    publicPath: './public',
    // global vars, access directly like window.
    globals: {
        example: 'world!'
    },
    plugins: [
        // vue plugins
        // require('your-plugin')
    ],
    compilerConfig: {
        // custom webpack config
    },
    onError: (err) => {}, // error handler
    onReady: () => {} // error handler
};

const renderer = vueRenderer(options);
app.use(renderer);

app.get('/', function(req, res) {
    res.render('example', { myVar1: 'my variable one' });
});

app.get('/plain', function(req, res) {
    // render template without html head and body
    res.render('example', { myVar1: 'my variable one' }, { plain: true });
});
```

File: example.vue

For head configuration check out [vue-head](https://github.com/ktquez/vue-head)

```
<template>
    <div id="app">
       {{myVar}} {{myVar2}}
    </div>
</template>

<script>
    import axios from 'axios';

    export default {
        name: 'Example',
        data() {
            return {
                myVar: 'Hello',
                myVar2: '',
                asyncExample: ''
            };
        },
        async asyncData() {
            let res = await axios.get('http://example.org/');
            return {asyncExample: res.data.example}
        },
        metaInfo: {
            title: 'Default Title',
            titleTemplate: '%s | My Awesome Website',
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' }
            ]
        },
        created() {
            this.myVar2 = example;
        },
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
```

## Changelog

[See CHANGELOG.md](https://github.com/vuexpress/vuexpress/blob/master/CHANGELOG.md)

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present, Dominik Weber