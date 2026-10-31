<script setup lang="ts">
// Mouse-wheel navigation shared by every lecture deck (mounted via each deck's global-top.vue).
// Wheel down → next, wheel up → previous. Uses next()/prev() so v-click steps advance
// exactly like the arrow keys. A cooldown swallows trackpad inertia so one swipe = one step.
import { useNav } from '@slidev/client'
import { onMounted, onUnmounted } from 'vue'

const THRESHOLD_PX = 50
const COOLDOWN_MS = 700

const { next, prev, isPresenter, isPrintMode, isEmbedded } = useNav()

let accumulated = 0
let coolingDown = false
let cooldownTimer: ReturnType<typeof setTimeout> | undefined

function startCooldown() {
  coolingDown = true
  clearTimeout(cooldownTimer)
  cooldownTimer = setTimeout(() => {
    coolingDown = false
    accumulated = 0
  }, COOLDOWN_MS)
}

// True if the wheel event should scroll some element (e.g. Slidev's overview / TOC panels).
function insideScrollable(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== document.body && el !== document.documentElement) {
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
      return true
    el = el.parentElement
  }
  return false
}

function onWheel(e: WheelEvent) {
  if (isPresenter.value || isPrintMode.value || isEmbedded.value) return
  if (e.ctrlKey) return // pinch / Ctrl+wheel zoom
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (insideScrollable(e.target)) return

  // Keep extending the cooldown while inertia events keep arriving.
  if (coolingDown) {
    startCooldown()
    return
  }

  const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
  accumulated += e.deltaY * scale

  if (Math.abs(accumulated) < THRESHOLD_PX) return

  const forward = accumulated > 0
  accumulated = 0
  startCooldown()
  if (forward) next()
  else prev()
}

onMounted(() => window.addEventListener('wheel', onWheel, { passive: true }))
onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)
  clearTimeout(cooldownTimer)
})
</script>

<template>
  <span style="display: none" />
</template>
