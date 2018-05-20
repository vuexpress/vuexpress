const path = require('path');
const express = require('express');
const vueRenderer = require('/Users/dweber/WorkspacePrivate/vuexpress/lib/index.js').vueRenderer;

const app = express();

let options = {
  views: './views',
  cache: false,
  watch: true,
  onError: (err) => {
    console.log(err)
  },
  onReady: () => {
    console.log('Ready')
  }
};

const renderer = vueRenderer(options);

app.use(renderer);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.render('example_default', {myVar: 'Hello World!'});
});
app.get('/test', function (req, res) {
  res.render('example_default2', {myVar: 'Hello World!'});
});

app.get('/example_template_only', function (req, res) {
  let items = [];
  for (let i = 0; i < 10000; i++) {
    items.push({id: i, text: 'Lorem ipsum'})
  }
  res.render('example_template_only', {items: items}, {plain: true});
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
