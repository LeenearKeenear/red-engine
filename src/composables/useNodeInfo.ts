import { ref } from 'vue'
import type { NodeInfo, Peer } from '../types/api'
import { fetchNodeInfo, fetchPublicPeers } from '../api/node'

// Fetches this node's identity and, optionally, its public peer list.
export function useNodeInfo(withPeers = false) {
  const nodeInfo = ref<NodeInfo | null>(null)
  const peers = ref<Peer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      if (withPeers) {
        const [info, peerList] = await Promise.all([fetchNodeInfo(), fetchPublicPeers()])
        nodeInfo.value = info
        peers.value = peerList
      } else {
        nodeInfo.value = await fetchNodeInfo()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load node info'
    } finally {
      loading.value = false
    }
  }

  void load()

  return { nodeInfo, peers, loading, error, reload: load }
}
