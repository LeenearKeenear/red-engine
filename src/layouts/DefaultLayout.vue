<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import AppSearch from '../components/AppSearch.vue'

const searchOpen = ref(false)

function onGlobalKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))
</script>

<template>
  <div class="min-h-screen bg-paper">
    <AppNavbar @open-search="searchOpen = true" />
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RouterView />
    </main>
    <AppSearch :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>
