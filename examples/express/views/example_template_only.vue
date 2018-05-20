<template>
  <div>
    <h1>Items</h1>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">{{item.text}}</li>
    </ul>
  </div>
</template>

<script>
  export default {
    name: 'Example default',
    data() {
      return {
        items: []
      };
    }
  }
</script>

<style lang="scss">
  body {
    p {
      color:red;
    }
  }
</style>
