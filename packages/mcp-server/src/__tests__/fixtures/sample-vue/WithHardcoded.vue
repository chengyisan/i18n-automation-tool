<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <p>欢迎使用国际化工具</p>
    <button>提交</button>
    <span>{{ $t('common.cancel') }}</span>
  </div>
</template>

<script setup lang="ts">
const title = '系统设置'
const options = [
  { label: '选项一', value: 1 },
  { label: '选项二', value: 2 },
]
</script>
