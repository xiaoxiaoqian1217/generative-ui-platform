<script setup lang="ts">
defineProps<{ componentType: string }>();
</script>

<template>
  <div class="catalog-component-preview" data-testid="catalog-component-preview">
    <section v-if="componentType === 'Card'" class="a2ui-component a2ui-card">
      <h3>示例 Card</h3>
      <p>这是受控的只读组件预览。</p>
    </section>
    <button v-else-if="componentType === 'Button'" class="a2ui-component a2ui-button" disabled type="button">示例 Button</button>
    <p v-else>该已登记组件暂无可预览的固定示例。</p>
  </div>
</template>
