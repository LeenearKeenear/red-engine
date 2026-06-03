import { ref, computed } from 'vue'
import { verifyAdmin } from '../api/admin'

const STORAGE_KEY = 'admin_token'

// Module-level singleton state so every component shares one auth session.
const token = ref<string>(localStorage.getItem(STORAGE_KEY) ?? '')
const isAuthed = computed(() => token.value !== '')

export function useAdmin() {
  async function login(candidate: string): Promise<void> {
    const trimmed = candidate.trim()
    if (!trimmed) throw new Error('Token is required')
    // Throws if the backend rejects the token.
    await verifyAdmin(trimmed)
    token.value = trimmed
    localStorage.setItem(STORAGE_KEY, trimmed)
  }

  function logout(): void {
    token.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  return { token, isAuthed, login, logout }
}
