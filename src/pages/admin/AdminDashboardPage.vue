<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { NodeInfo } from '../../types/api'
import { fetchNodeInfo } from '../../api/node'
import { useAdmin } from '../../composables/useAdmin'
import { triggerReload, rescanNavigation } from '../../api/admin'
import NodeIdentityCard from '../../components/admin/NodeIdentityCard.vue'

const { token } = useAdmin()
const info = ref<NodeInfo | null>(null)
const loading = ref(true)
const status = ref<string | null>(null)
const busy = ref(false)

onMounted(async () => {
  try {
    info.value = await fetchNodeInfo()
  } finally {
    loading.value = false
  }
})

async function reload() {
  busy.value = true
  status.value = null
  try {
    await triggerReload(token.value)
    status.value = 'Content reloaded.'
  } catch (e) {
    status.value = e instanceof Error ? e.message : 'Reload failed'
  } finally {
    busy.value = false
  }
}

async function rescan() {
  busy.value = true
  status.value = null
  try {
    await rescanNavigation(token.value)
    status.value = 'Navigation re-scanned.'
  } catch (e) {
    status.value = e instanceof Error ? e.message : 'Rescan failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="font-serif text-3xl font-bold text-ink">Dashboard</h1>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink-mid transition-colors hover:bg-paper-2 disabled:opacity-60"
          @click="rescan"
        >Rescan nav</button>
        <button
          type="button"
          :disabled="busy"
          class="rounded-lg bg-imperial px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-imperial-dark disabled:opacity-60"
          @click="reload"
        >Reload content</button>
      </div>
    </header>

    <p v-if="status" class="rounded-lg border border-accent/30 bg-accent-soft px-4 py-2 text-sm text-accent-deep">
      {{ status }}
    </p>

    <p v-if="loading" class="text-ink-muted">Loading&hellip;</p>
    <NodeIdentityCard v-else-if="info" :info="info" />
  </div>
</template>
