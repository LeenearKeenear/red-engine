import { ref, watch, type Ref } from 'vue'
import type { NavNode } from '../types/api'
import { fetchSubtree } from '../api/navigation'

// Reactively fetches the navigation subtree rooted at `path`.
export function useNavigation(path: Ref<string>) {
  const node = ref<NavNode | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(p: string) {
    if (!p) {
      node.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      node.value = await fetchSubtree(p)
    } catch (e) {
      node.value = null
      error.value = e instanceof Error ? e.message : 'Failed to load navigation'
    } finally {
      loading.value = false
    }
  }

  watch(path, (p) => void load(p), { immediate: true })

  return { node, loading, error, reload: () => load(path.value) }
}
