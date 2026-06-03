<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { AdminPeer } from '../../types/api'
import { useAdmin } from '../../composables/useAdmin'
import {
  listPeers,
  addPeer,
  deletePeer,
  refreshPeer,
  checkPeerHealth,
} from '../../api/admin'
import PeerTable from '../../components/admin/PeerTable.vue'

const { token } = useAdmin()
const peers = ref<AdminPeer[]>([])
const loading = ref(true)
const busyUrl = ref('')
const status = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

// Add-peer form
const newUrl = ref('')
const newType = ref('upstream')
const importPeers = ref(false)
const adding = ref(false)

async function refreshList() {
  loading.value = true
  try {
    peers.value = await listPeers(token.value)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to load peers'
  } finally {
    loading.value = false
  }
}

onMounted(refreshList)

async function onAdd() {
  if (!newUrl.value.trim()) return
  adding.value = true
  status.value = null
  errorMsg.value = null
  try {
    await addPeer(token.value, newUrl.value.trim(), newType.value, importPeers.value)
    status.value = 'Peer added.'
    newUrl.value = ''
    importPeers.value = false
    await refreshList()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to add peer'
  } finally {
    adding.value = false
  }
}

async function onRemove(url: string) {
  busyUrl.value = url
  try {
    await deletePeer(token.value, url)
    await refreshList()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to remove peer'
  } finally {
    busyUrl.value = ''
  }
}

async function onRefresh(url: string) {
  busyUrl.value = url
  try {
    await refreshPeer(token.value, url)
    await refreshList()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Failed to refresh peer'
  } finally {
    busyUrl.value = ''
  }
}

async function onHealth(url: string) {
  busyUrl.value = url
  status.value = null
  try {
    const up = await checkPeerHealth(token.value, url)
    status.value = `${url} is ${up ? 'online' : 'offline'}.`
    const peer = peers.value.find((p) => p.url === url)
    if (peer) peer.is_online = up
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Health check failed'
  } finally {
    busyUrl.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <h1 class="font-serif text-3xl font-bold text-ink">Peers</h1>

    <!-- Add peer -->
    <form
      class="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4"
      @submit.prevent="onAdd"
    >
      <div class="flex-1 min-w-[14rem]">
        <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-mid">Peer URL</label>
        <input
          v-model="newUrl"
          type="text"
          placeholder="https://peer.example.org"
          class="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-imperial focus:ring-2 focus:ring-imperial/20"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-mid">Type</label>
        <select
          v-model="newType"
          class="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-imperial"
        >
          <option value="upstream">upstream</option>
          <option value="downstream">downstream</option>
          <option value="mirror">mirror</option>
        </select>
      </div>
      <label class="flex items-center gap-2 pb-2 text-sm text-ink-mid">
        <input v-model="importPeers" type="checkbox" class="rounded border-line" />
        Import peers
      </label>
      <button
        type="submit"
        :disabled="adding"
        class="rounded-lg bg-imperial px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-imperial-dark disabled:opacity-60"
      >{{ adding ? 'Adding…' : 'Add peer' }}</button>
    </form>

    <p v-if="status" class="rounded-lg border border-accent/30 bg-accent-soft px-4 py-2 text-sm text-accent-deep">{{ status }}</p>
    <p v-if="errorMsg" class="rounded-lg border border-imperial/30 bg-imperial-soft px-4 py-2 text-sm text-imperial-deep">{{ errorMsg }}</p>

    <p v-if="loading" class="text-ink-muted">Loading&hellip;</p>
    <PeerTable
      v-else
      :peers="peers"
      :busy-url="busyUrl"
      @remove="onRemove"
      @refresh="onRefresh"
      @health="onHealth"
    />
  </div>
</template>
