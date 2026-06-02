<script setup lang="ts">
import type { AdminPeer } from '../../types/api'

defineProps<{ peers: AdminPeer[]; busyUrl: string }>()
const emit = defineEmits<{
  refresh: [url: string]
  remove: [url: string]
  health: [url: string]
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-line bg-white">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-line bg-paper-2 text-left text-xs uppercase tracking-wide text-ink-muted">
          <th class="px-4 py-3 font-semibold">Name</th>
          <th class="px-4 py-3 font-semibold">URL</th>
          <th class="px-4 py-3 font-semibold">Type</th>
          <th class="px-4 py-3 font-semibold">Status</th>
          <th class="px-4 py-3 font-semibold">Last seen</th>
          <th class="px-4 py-3 text-right font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="peer in peers" :key="peer.url" class="border-b border-line last:border-0">
          <td class="px-4 py-3 font-medium text-ink">{{ peer.name || '—' }}</td>
          <td class="px-4 py-3"><span class="break-all font-mono text-xs text-ink-mid">{{ peer.url }}</span></td>
          <td class="px-4 py-3">
            <span class="rounded border border-imperial/20 bg-imperial-soft px-2 py-0.5 text-xs font-medium text-imperial-deep">
              {{ peer.peer_type }}
            </span>
          </td>
          <td class="px-4 py-3">
            <span
              class="rounded px-2 py-0.5 text-xs font-bold uppercase"
              :class="peer.is_online ? 'bg-accent-soft text-accent-dark' : 'bg-gray-100 text-gray-500'"
            >{{ peer.is_online ? 'Online' : 'Offline' }}</span>
          </td>
          <td class="px-4 py-3 text-xs text-ink-muted">{{ peer.last_seen?.slice(0, 10) || '—' }}</td>
          <td class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <button
                type="button"
                :disabled="busyUrl === peer.url"
                class="rounded border border-line px-2 py-1 text-xs text-ink-mid transition-colors hover:bg-paper-2 disabled:opacity-50"
                @click="emit('health', peer.url)"
              >Ping</button>
              <button
                type="button"
                :disabled="busyUrl === peer.url"
                class="rounded border border-line px-2 py-1 text-xs text-ink-mid transition-colors hover:bg-paper-2 disabled:opacity-50"
                @click="emit('refresh', peer.url)"
              >Refresh</button>
              <button
                type="button"
                :disabled="busyUrl === peer.url"
                class="rounded border border-imperial/40 px-2 py-1 text-xs text-imperial transition-colors hover:bg-imperial-soft disabled:opacity-50"
                @click="emit('remove', peer.url)"
              >Remove</button>
            </div>
          </td>
        </tr>
        <tr v-if="!peers.length">
          <td colspan="6" class="px-4 py-8 text-center text-ink-muted">No peers configured.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
