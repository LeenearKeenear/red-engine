import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import '../internal/router/static/tailwind-input.css'
import '../internal/router/static/style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [],
})

createApp(App).use(router).mount('#root')
