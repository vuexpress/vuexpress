<template>
  <div>
    <h1>Items</h1>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">{{item.text}}</li>
    </ul>
  </div>
</template>
