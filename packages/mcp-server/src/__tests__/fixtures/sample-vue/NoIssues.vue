<template>
  <div class="page">
    <h1>{{ $t('page.title') }}</h1>
    <p>{{ $t('page.description') }}</p>
    <button>{{ $t('common.submit') }}</button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
