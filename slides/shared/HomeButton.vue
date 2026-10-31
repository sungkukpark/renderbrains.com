<script setup lang="ts">
// Return-to-blog link shared by every lecture deck (mounted via each deck's global-top.vue).
// Hidden by default so it never competes with slide content; it fades in only while the
// pointer is moving (like Slidev's own nav controls) or when focused from the keyboard.
import { useNav } from '@slidev/client'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const IDLE_MS = 2000

const { isPresenter, isPrintMode, isEmbedded } = useNav()
const visible = computed(() => !isPresenter.value && !isPrintMode.value && !isEmbedded.value)

const active = ref(false)
let idleTimer: ReturnType<typeof setTimeout> | undefined

function wake() {
  active.value = true
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { active.value = false }, IDLE_MS)
}

onMounted(() => window.addEventListener('mousemove', wake, { passive: true }))
onUnmounted(() => {
  window.removeEventListener('mousemove', wake)
  clearTimeout(idleTimer)
})
</script>

<template>
  <a
    v-if="visible"
    href="/"
    class="home-button"
    :class="{ active }"
    aria-label="블로그 홈으로"
    title="블로그 홈으로"
  >
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9v11h5v-6h4v6h5V9" />
    </svg>
  </a>
</template>

<style scoped>
.home-button {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: #4b5563;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  text-decoration: none;
}
.home-button.active {
  opacity: 0.5;
  pointer-events: auto;
}
.home-button:hover,
.home-button:focus-visible {
  opacity: 1;
  pointer-events: auto;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
@media print {
  .home-button { display: none; }
}
</style>
