<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Peer } from '../types/api'
import { describe } from '../lib/branding'

const props = defineProps<{ peer: Peer }>()

const copied = ref(false)
const description = computed(() => describe(props.peer.description))
const tunnel = computed(() => props.peer.tunnel_type || 'direct')
const reachUrl = computed(() => props.peer.public_url || props.peer.url)

async function copyKey() {
  if (!props.peer.public_key) return
  try {
    await navigator.clipboard.writeText(props.peer.public_key)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* clipboard unavailable */
  }
}
</script>

<template>
  <article class="flex flex-col gap-3 rounded-xl border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate font-serif text-lg font-bold text-ink">{{ peer.name }}</h3>
        <a
          :href="reachUrl"
          target="_blank"
          rel="noopener"
          class="truncate text-sm text-accent hover:underline"
        >{{ reachUrl }}</a>
      </div>
      <span
        class="shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
        :class="peer.is_online
          ? 'bg-accent-soft text-accent-dark'
          : 'bg-gray-100 text-gray-500'"
      >
        {{ peer.is_online ? 'Online' : 'Offline' }}
      </span>
    </header>

    <p class="text-sm text-ink-muted">{{ description }}</p>

    <div class="flex flex-wrap gap-2 text-xs">
      <span class="rounded border border-imperial/20 bg-imperial-soft px-2 py-0.5 font-medium text-imperial-deep">
        {{ peer.peer_type }}
      </span>
      <span class="rounded border border-line bg-paper-2 px-2 py-0.5 font-medium text-ink-mid">
        {{ tunnel }}
      </span>
    </div>

    <div v-if="peer.exported_paths?.length" class="flex flex-wrap gap-1.5">
      <RouterLink
        v-for="p in peer.exported_paths"
        :key="p"
        :to="'/' + p.replace(/^\/+/, '')"
        class="rounded bg-paper-2 px-2 py-0.5 font-mono text-xs text-ink-mid transition-colors hover:text-imperial"
      >{{ p }}</RouterLink>
    </div>

    <button
      v-if="peer.public_key"
      type="button"
      @click="copyKey"
      class="mt-1 self-start rounded-md border border-line bg-paper-2 px-3 py-1 text-xs font-medium text-ink-mid transition-colors hover:bg-paper"
    >
      {{ copied ? 'Copied!' : 'Copy public key' }}
    </button>
  </article>
</template>
