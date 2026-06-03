import type { NodeInfo, Peer } from '../types/api'
import { getJSON } from './http'

// GET /-/nodeinfo → this node's public identity.
export function fetchNodeInfo(): Promise<NodeInfo> {
  return getJSON<NodeInfo>('/-/nodeinfo')
}

// GET /-/peers → public list of known peers (null when empty).
export async function fetchPublicPeers(): Promise<Peer[]> {
  return (await getJSON<Peer[] | null>('/-/peers')) ?? []
}
