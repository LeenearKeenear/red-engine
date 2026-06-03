<script setup lang="ts">
import type { NodeInfo } from '../../types/api'

defineProps<{ info: NodeInfo }>()
</script>

<template>
  <div class="rounded-xl border border-line bg-white p-6">
    <h2 class="font-serif text-xl font-bold text-ink">{{ info.name }}</h2>
    <p class="mt-1 text-sm text-ink-muted">{{ info.description || '—' }}</p>

    <dl class="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Public key</dt>
        <dd class="break-all font-mono text-xs text-ink-mid">{{ info.public_key }}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Version</dt>
        <dd class="text-ink-mid">{{ info.software_version || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Public URL</dt>
        <dd class="break-all text-ink-mid">{{ info.public_url || '—' }}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tunnel</dt>
        <dd class="text-ink-mid">{{ info.tunnel_type || 'direct' }}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Exported paths</dt>
        <dd class="mt-1 flex flex-wrap gap-1.5">
          <span
            v-for="p in info.exported_paths"
            :key="p"
            class="rounded bg-paper-2 px-2 py-0.5 font-mono text-xs text-ink-mid"
          >{{ p }}</span>
          <span v-if="!info.exported_paths?.length" class="text-ink-muted">none</span>
        </dd>
      </div>
    </dl>
  </div>
</template>
