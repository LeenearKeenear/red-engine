<script setup lang="ts">
import type { Crumb } from '../types/api'

// Crumb paths already carry a leading slash, so they are valid RouterLink targets.
defineProps<{ crumbs: Crumb[] }>()
</script>

<template>
  <nav class="flex flex-wrap items-center gap-1 text-sm text-ink-muted" aria-label="Breadcrumb">
    <RouterLink to="/" class="transition-colors hover:text-imperial">Home</RouterLink>
    <template v-for="crumb in crumbs" :key="crumb.path">
      <span aria-hidden="true" class="text-line">/</span>
      <RouterLink
        :to="crumb.path"
        class="transition-colors hover:text-imperial last:font-semibold last:text-ink"
      >
        {{ crumb.label }}
      </RouterLink>
    </template>
  </nav>
</template>
