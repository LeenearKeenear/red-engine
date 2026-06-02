<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { StartupSync } from '../../types/api'
import { useAdmin } from '../../composables/useAdmin'
import { listSyncs, removeSync, triggerImport } from '../../api/admin'
import SyncTable from '../../components/admin/SyncTable.vue'

const { token } = useAdmin()
const syncs = ref<StartupSync[]>([])
const loading = ref(true)
const busyName = ref('')
const status = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const importUrl = ref('')
const importName = ref('')
const importing = ref(false)

async function refreshList() {
  loading.value = true
  try {
    syncs.value = await listSyncs(token.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to load syncs'
  } finally {
    loading.value = false
  }
}

onMounted(refreshList)

async function onImport() {
  if (!importUrl.value.trim()) return
  importing.value = true
  status.value = null
  errorMsg.value = null
  try {
    status.value = await triggerImport(token.value, importUrl.value.trim(), importName.value.trim(), true)
    importUrl.value = ''
    importName.value = ''
    await refreshList()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Import failed'
  } finally {
    importing.value = false
  }
}

async function onRemove(filename: string) {
  busyName.value = filename
  try {
    await removeSync(token.value, filename)
    await refreshList()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to remove sync'
  } finally {
    busyName.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <h1 class="font-serif text-3xl font-bold text-ink">Startup Sync</h1>

    <form
      class="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4"
      @submit.prevent="onImport"
    >
      <div class="min-w-[16rem] flex-[2]">
        <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-mid">Source URL</label>
        <input
          v-model="importUrl"
          type="text"
          placeholder="https://github.com/org/repo or .md/.zip/.tar.gz"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-imperial focus:ring-2 focus:ring-imperial/20"
        />
      </div>
      <div class="min-w-[10rem] flex-1">
        <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-mid">Folder name (optional)</label>
        <input
          v-model="importName"
          type="text"
          placeholder="auto"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-imperial focus:ring-2 focus:ring-imperial/20"
        />
      </div>
      <button
        type="submit"
        :disabled="importing"
        class="rounded-lg bg-imperial px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-imperial-dark disabled:opacity-60"
      >{{ importing ? 'Importing…' : 'Import & track' }}</button>
    </form>

    <p v-if="status" class="rounded-lg border border-accent/30 bg-accent-soft px-4 py-2 text-sm text-accent-deep">{{ status }}</p>
    <p v-if="errorMsg" class="rounded-lg border border-imperial/30 bg-imperial-soft px-4 py-2 text-sm text-imperial-deep">{{ errorMsg }}</p>

    <p v-if="loading" class="text-ink-muted">Loading&hellip;</p>
    <SyncTable v-else :syncs="syncs" :busy-name="busyName" @remove="onRemove" />
  </div>
</template>
