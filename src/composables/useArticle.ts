import { ref, watch, type Ref } from 'vue'
import type { Article } from '../types/api'
import { fetchArticle } from '../api/content'

// Reactively fetches article/directory content whenever `path` changes.
export function useArticle(path: Ref<string>) {
  const article = ref<Article | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(p: string) {
    loading.value = true
    error.value = null
    try {
      article.value = await fetchArticle(p)
    } catch (e) {
      article.value = null
      error.value = e instanceof Error ? e.message : 'Failed to load content'
    } finally {
      loading.value = false
    }
  }

  watch(path, (p) => void load(p), { immediate: true })

  return { article, loading, error, reload: () => load(path.value) }
}
