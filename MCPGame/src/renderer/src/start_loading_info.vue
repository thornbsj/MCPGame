<template>
  <div class="Start">
    <div class="background-effect"></div>
    <div class="name-input-container">
      <div class="input-panel">
        <div v-for="(record, index) in loadingInfo" :key="'old-' + index" class="input-title">
          {{ record }}
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue'
import type { Ref } from 'vue'

const loadingInfo = inject('loadingInfo') as Ref<string[]>
</script>
