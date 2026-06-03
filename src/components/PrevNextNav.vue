<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleRef } from '../types/api'
import { withLeadingSlash } from '../api/paths'

const props = defineProps<{
  prev: ArticleRef | null
  next: ArticleRef | null
}>()

const prevTo = computed(() => (props.prev ? withLeadingSlash(props.prev.path) : ''))
const nextTo = computed(() => (props.next ? withLeadingSlash(props.next.path) : ''))
</script>

<template>
  <nav class="mt-10 grid grid-cols-2 gap-4 border-t border-line pt-6">
    <RouterLink
      v-if="prev"
      :to="prevTo"
      class="group flex flex-col rounded-lg border border-line bg-white p-4 no-underline transition-colors hover:border-imperial/40"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">&larr; Previous</span>
      <span class="mt-1 font-medium text-ink transition-colors group-hover:text-imperial">{{ prev.title }}</span>
    </RouterLink>
    <span v-else></span>

    <RouterLink
      v-if="next"
      :to="nextTo"
      class="group flex flex-col items-end rounded-lg border border-line bg-white p-4 text-right no-underline transition-colors hover:border-imperial/40"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Next &rarr;</span>
      <span class="mt-1 font-medium text-ink transition-colors group-hover:text-imperial">{{ next.title }}</span>
    </RouterLink>
    <span v-else></span>
  </nav>
</template>
