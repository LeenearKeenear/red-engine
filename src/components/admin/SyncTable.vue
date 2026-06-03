<script setup lang="ts">
import type { StartupSync } from '../../types/api'

defineProps<{ syncs: StartupSync[]; busyName: string }>()
const emit = defineEmits<{ remove: [filename: string] }>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-line bg-white">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-line bg-paper-2 text-left text-xs uppercase tracking-wide text-ink-muted">
          <th class="px-4 py-3 font-semibold">Filename</th>
          <th class="px-4 py-3 font-semibold">URL</th>
          <th class="px-4 py-3 font-semibold">Type</th>
          <th class="px-4 py-3 font-semibold">Status</th>
          <th class="px-4 py-3 font-semibold">Last synced</th>
          <th class="px-4 py-3 text-right font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in syncs" :key="s.id" class="border-b border-line last:border-0">
          <td class="px-4 py-3 font-medium text-ink">{{ s.filename }}</td>
          <td class="px-4 py-3"><span class="break-all font-mono text-xs text-ink-mid">{{ s.url }}</span></td>
          <td class="px-4 py-3 text-xs text-ink-mid">{{ s.sync_type || '—' }}</td>
          <td class="px-4 py-3">
            <span
              class="rounded px-2 py-0.5 text-xs font-medium"
              :class="s.last_error
                ? 'bg-imperial-soft text-imperial-deep'
                : 'bg-accent-soft text-accent-dark'"
              :title="s.last_error || ''"
            >{{ s.last_error ? 'Error' : (s.sync_status || 'ok') }}</span>
          </td>
          <td class="px-4 py-3 text-xs text-ink-muted">{{ s.last_synced_at?.slice(0, 10) || '—' }}</td>
          <td class="px-4 py-3 text-right">
            <button
              type="button"
              :disabled="busyName === s.filename"
              class="rounded border border-imperial/40 px-2 py-1 text-xs text-imperial transition-colors hover:bg-imperial-soft disabled:opacity-50"
              @click="emit('remove', s.filename)"
            >Remove</button>
          </td>
        </tr>
        <tr v-if="!syncs.length">
          <td colspan="6" class="px-4 py-8 text-center text-ink-muted">No startup syncs configured.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
