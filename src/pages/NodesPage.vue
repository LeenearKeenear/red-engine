<script setup lang="ts">
import { computed } from 'vue'
import { useNodeInfo } from '../composables/useNodeInfo'
import { describe } from '../lib/branding'
import NodeCard from '../components/NodeCard.vue'

const { nodeInfo, peers, loading, error } = useNodeInfo(true)

const exported = computed(() => nodeInfo.value?.exported_paths ?? [])
</script>

<template>
  <div class="space-y-8">
    <h1 class="font-serif text-3xl font-bold text-ink">Federation Directory</h1>

    <p v-if="loading" class="text-ink-muted">Loading&hellip;</p>
    <p v-else-if="error" class="text-imperial">{{ error }}</p>

    <template v-else>
      <!-- Self identity -->
      <section
        v-if="nodeInfo"
        class="rounded-2xl border border-accent/20 bg-accent-soft p-6"
      >
        <div class="flex items-center gap-2">
          <span class="rounded bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">This node</span>
          <h2 class="font-serif text-2xl font-bold text-accent-deep">{{ nodeInfo.name }}</h2>
        </div>
        <p class="mt-2 text-ink-mid">{{ describe(nodeInfo.description) }}</p>
        <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Public key</dt>
            <dd class="break-all font-mono text-xs text-ink-mid">{{ nodeInfo.public_key }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Version</dt>
            <dd class="text-ink-mid">{{ nodeInfo.software_version || '—' }}</dd>
          </div>
          <div v-if="nodeInfo.public_url">
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Public URL</dt>
            <dd class="break-all text-ink-mid">{{ nodeInfo.public_url }}</dd>
          </div>
          <div v-if="exported.length">
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Exported paths</dt>
            <dd class="flex flex-wrap gap-1.5">
              <RouterLink
                v-for="p in exported"
                :key="p"
                :to="'/' + p.replace(/^\/+/, '')"
                class="rounded bg-white/70 px-2 py-0.5 font-mono text-xs text-accent-deep hover:underline"
              >{{ p }}</RouterLink>
            </dd>
          </div>
        </dl>
      </section>

      <!-- Peers -->
      <section>
        <h2 class="mb-4 font-serif text-2xl font-bold text-ink">
          Known Peers <span class="text-base font-normal text-ink-muted">({{ peers.length }})</span>
        </h2>
        <div v-if="peers.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NodeCard v-for="peer in peers" :key="peer.url" :peer="peer" />
        </div>
        <p v-else class="rounded-xl border border-line bg-white p-6 text-center text-ink-muted">
          No peers known yet.
        </p>
      </section>
    </template>
  </div>
</template>
