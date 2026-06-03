<template>
  <div class="reactive-issue-demo">
    <h1>{{ title }}</h1>
    <button @click="handleClick">{{ buttonText }}</button>
    <ul>
      <li v-for="item in options" :key="item.value">
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 响应式问题：直接赋值给 ref
const title = ref(t('demo.title'))
const buttonText = ref(t('demo.button'))

// 响应式问题：静态数组中使用 t()
const options = [
  { label: t('common.yes'), value: 1 },
  { label: t('common.no'), value: 0 },
]

function handleClick() {
  console.log('clicked')
}
</script>

<style scoped>
.reactive-issue-demo {
  padding: 20px;
}
</style>
