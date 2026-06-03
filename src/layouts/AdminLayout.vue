<script setup lang="ts">
import { useAdmin } from '../composables/useAdmin'
import AdminTokenGatePage from '../pages/admin/AdminTokenGatePage.vue'

const { isAuthed, logout } = useAdmin()

const links = [
  { to: '/-/admin/dashboard', label: 'Dashboard' },
  { to: '/-/admin/peers', label: 'Peers' },
  { to: '/-/admin/contributors', label: 'Contributors' },
  { to: '/-/admin/sync', label: 'Sync' },
]
</script>

<template>
  <!-- Token gate replaces the whole shell until authenticated. -->
  <AdminTokenGatePage v-if="!isAuthed" />

  <div v-else class="flex min-h-screen bg-paper">
    <aside class="flex w-56 shrink-0 flex-col border-r border-line bg-white">
      <div class="border-b border-line px-5 py-4">
        <RouterLink to="/" class="font-serif text-lg font-bold text-imperial no-underline">
          RED Engine
        </RouterLink>
        <p class="text-xs uppercase tracking-wide text-ink-muted">Admin Console</p>
      </div>
      <nav class="flex flex-1 flex-col gap-1 p-3">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3 py-2 text-sm font-medium text-ink-mid no-underline transition-colors hover:bg-paper-2 hover:text-imperial"
          active-class="bg-imperial-soft text-imperial"
        >{{ link.label }}</RouterLink>
      </nav>
      <div class="border-t border-line p-3">
        <button
          type="button"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-mid transition-colors hover:bg-paper-2"
          @click="logout"
        >Log out</button>
      </div>
    </aside>

    <main class="flex-1 overflow-x-hidden px-6 py-8">
      <RouterView />
    </main>
    <footer class="fixed bottom-0 right-0 px-4 py-2 text-xs text-ink-muted">
      Powered by RED Collective
    </footer>
  </div>
</template>
