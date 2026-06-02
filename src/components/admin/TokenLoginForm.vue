<script setup lang="ts">
import { ref } from 'vue'
import { useAdmin } from '../../composables/useAdmin'

const { login } = useAdmin()
const token = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  error.value = null
  busy.value = true
  try {
    await login(token.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Invalid token'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label class="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-mid">
        Admin token
      </label>
      <input
        v-model="token"
        type="password"
        autocomplete="current-password"
        placeholder="Paste your admin token"
        class="w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-imperial focus:ring-2 focus:ring-imperial/20"
      />
    </div>
    <p v-if="error" class="text-sm text-imperial">{{ error }}</p>
    <button
      type="submit"
      :disabled="busy"
      class="w-full rounded-lg bg-imperial px-4 py-2.5 font-semibold text-white transition-colors hover:bg-imperial-dark disabled:opacity-60"
    >
      {{ busy ? 'Verifying…' : 'Unlock console' }}
    </button>
  </form>
</template>
