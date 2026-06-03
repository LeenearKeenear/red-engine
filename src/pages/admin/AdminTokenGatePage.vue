<script setup lang="ts">
import TokenLoginForm from '../../components/admin/TokenLoginForm.vue'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-imperial-soft to-accent-soft p-4">
    <div class="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-xl">
      <RouterLink to="/" class="font-serif text-2xl font-bold text-imperial no-underline">
        RED Engine
      </RouterLink>
      <p class="mt-1 mb-6 text-sm text-ink-muted">Admin console — authentication required.</p>
      <TokenLoginForm />
    </div>
  </div>
</template>
