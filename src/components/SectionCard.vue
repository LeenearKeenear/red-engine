<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NavNode } from '../types/api'
import { withLeadingSlash, stripLeadingSlash } from '../api/paths'
import { coverColor, describe } from '../lib/branding'

const props = defineProps<{ node: NavNode }>()

// .meta assets are addressed by the slash-less branch path.
const metaPath = computed(() => stripLeadingSlash(props.node.path))
const to = computed(() => withLeadingSlash(props.node.path))

const coverFailed = ref(false)
const iconFailed = ref(false)

const fallbackColor = computed(() => coverColor(props.node.path))
const initial = computed(() => (props.node.display_name || '?').charAt(0).toUpperCase())
const description = computed(() => describe(props.node.description))
const folders = computed(() => props.node.child_count ?? 0)
const guides = computed(() => props.node.guide_count ?? 0)
</script>

<template>
  <RouterLink
    :to="to"
    class="group flex flex-col overflow-hidden rounded-xl border border-line bg-white no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
  >
    <!-- Cover: real image when present, solid brand color otherwise -->
    <div class="relative h-32 w-full overflow-hidden">
      <img
        v-if="!coverFailed"
        :src="`/-/branch-meta/${metaPath}/cover.jpg`"
        :alt="node.display_name"
        class="h-full w-full object-cover"
        loading="lazy"
        @error="coverFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center"
        :style="{ backgroundColor: fallbackColor }"
      >
        <span class="font-serif text-5xl font-bold text-white/90">{{ initial }}</span>
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <div class="flex items-center gap-2">
        <img
          v-if="!iconFailed"
          :src="`/-/branch-meta/${metaPath}/icon.svg`"
          class="h-6 w-6 shrink-0"
          alt=""
          @error="iconFailed = true"
        />
        <h3 class="font-serif text-lg font-bold text-ink transition-colors group-hover:text-imperial">
          {{ node.display_name }}
        </h3>
      </div>
      <p class="line-clamp-2 flex-1 text-sm text-ink-muted">{{ description }}</p>
      <div class="mt-1 flex gap-3 text-xs font-medium text-ink-muted">
        <span>{{ folders }} {{ folders === 1 ? 'folder' : 'folders' }}</span>
        <span class="text-line">&middot;</span>
        <span>{{ guides }} {{ guides === 1 ? 'guide' : 'guides' }}</span>
      </div>
    </div>
  </RouterLink>
</template>
