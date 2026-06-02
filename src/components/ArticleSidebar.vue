<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { NavNode } from '../types/api'
import { fetchSubtree } from '../api/navigation'
import { branchRoot, withLeadingSlash } from '../api/paths'
import SidebarNode from './SidebarNode.vue'

const props = defineProps<{ currentPath: string }>()

const root = ref<NavNode | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const open = ref(false) // mobile drawer state

const rootPath = computed(() => branchRoot(props.currentPath))
const rootLink = computed(() => withLeadingSlash(rootPath.value))
const children = computed(() => root.value?.children ?? [])

async function load() {
  const rp = rootPath.value
  if (!rp) {
    root.value = null
    return
  }
  loading.value = true
  error.value = null
  try {
    root.value = await fetchSubtree(rp)
  } catch (e) {
    root.value = null
    error.value = e instanceof Error ? e.message : 'Failed to load tree'
  } finally {
    loading.value = false
  }
}

// Re-fetch only when the top-level branch changes (not on every article).
watch(rootPath, () => void load(), { immediate: true })
</script>

<template>
  <div>
    <!-- Mobile toggle -->
    <button
      type="button"
      class="mb-3 inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-mid lg:hidden"
      @click="open = !open"
    >
      <span aria-hidden="true">&#9776;</span> {{ open ? 'Hide' : 'Browse' }} files
    </button>

    <aside
      class="rounded-xl border border-line bg-white p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
      :class="{ hidden: !open, block: open, 'lg:block': true }"
    >
      <header class="mb-3 border-b border-line px-2 pb-3">
        <RouterLink
          :to="rootLink"
          class="block font-serif text-base font-bold text-ink no-underline transition-colors hover:text-imperial"
        >
          {{ root?.display_name || 'Branch' }}
        </RouterLink>
        <p class="mt-0.5 text-xs uppercase tracking-wide text-ink-muted">
          Reading branch: {{ root?.display_name || rootPath.replace(/^\//, '') }}
        </p>
      </header>

      <p v-if="loading" class="px-2 py-1 text-sm text-ink-muted">Loading&hellip;</p>
      <p v-else-if="error" class="px-2 py-1 text-sm text-imperial">{{ error }}</p>
      <nav v-else-if="children.length" class="flex flex-col gap-0.5">
        <SidebarNode
          v-for="child in children"
          :key="child.path"
          :node="child"
          :current-path="currentPath"
          :depth="0"
        />
      </nav>
      <p v-else class="px-2 py-1 text-sm text-ink-muted">No files in this branch.</p>
    </aside>
  </div>
</template>
