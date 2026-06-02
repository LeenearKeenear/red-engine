<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { NavNode, RecentFile, NodeInfo } from '../types/api'
import { fetchTopLevel } from '../api/navigation'
import { fetchRecentFiles } from '../api/content'
import { fetchNodeInfo } from '../api/node'
import { describe } from '../lib/branding'
import SectionCard from '../components/SectionCard.vue'
import ArticleListItem from '../components/ArticleListItem.vue'

const sections = ref<NavNode[]>([])
const recent = ref<RecentFile[]>([])
const nodeInfo = ref<NodeInfo | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [secs, files, info] = await Promise.allSettled([
      fetchTopLevel(),
      fetchRecentFiles(5),
      fetchNodeInfo(),
    ])
    if (secs.status === 'fulfilled') {
      // /api/navigation (no path) returns ALL nodes flat, including nested ones.
      // Keep only true top-level branches (path has no "/").
      sections.value = secs.value.filter((n) => !n.path.includes('/'))
    }
    if (files.status === 'fulfilled') recent.value = files.value
    if (info.status === 'fulfilled') nodeInfo.value = info.value
    if (secs.status === 'rejected') error.value = 'Failed to load navigation.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-10">
    <!-- Hero -->
    <section
      class="rounded-2xl bg-linear-to-br from-imperial-deep via-imperial to-accent-deep p-8 text-white shadow-md sm:p-10"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">RED Engine</p>
      <h1 class="mt-1 font-serif text-4xl font-bold">
        {{ nodeInfo?.name || 'RED Engine' }}
      </h1>
      <p class="mt-2 max-w-2xl text-lg text-white/85">
        {{ describe(nodeInfo?.description) }}
      </p>
    </section>

    <p v-if="loading" class="text-ink-muted">Loading&hellip;</p>
    <p v-else-if="error" class="text-imperial">{{ error }}</p>

    <!-- Branches -->
    <section v-if="sections.length">
      <h2 class="mb-4 font-serif text-2xl font-bold text-ink">Branches</h2>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard v-for="s in sections" :key="s.path" :node="s" />
      </div>
    </section>

    <!-- Recently added -->
    <section v-if="recent.length">
      <h2 class="mb-4 font-serif text-2xl font-bold text-ink">Recently Added</h2>
      <div class="flex flex-col gap-2">
        <ArticleListItem
          v-for="f in recent"
          :key="f.path"
          :title="f.title"
          :path="f.path"
          :author="f.author"
          :state="f.verification_state"
        />
      </div>
    </section>
  </div>
</template>
