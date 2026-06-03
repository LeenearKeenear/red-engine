<script setup lang="ts">
import { computed } from 'vue'
import type { VerificationState } from '../types/api'
import { withLeadingSlash } from '../api/paths'
import VerificationBadge from './VerificationBadge.vue'

const props = defineProps<{
  title: string
  path: string
  author?: string
  state?: VerificationState
}>()

const to = computed(() => withLeadingSlash(props.path))
</script>

<template>
  <RouterLink
    :to="to"
    class="group flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 no-underline transition-colors hover:border-imperial/40 hover:bg-imperial-soft/40"
  >
    <div class="min-w-0 flex-1">
      <p class="truncate font-medium text-ink transition-colors group-hover:text-imperial">
        {{ title }}
      </p>
      <p v-if="author" class="truncate text-xs text-ink-muted">by {{ author }}</p>
    </div>
    <div v-if="state" class="shrink-0">
      <VerificationBadge :state="state" />
    </div>
  </RouterLink>
</template>
