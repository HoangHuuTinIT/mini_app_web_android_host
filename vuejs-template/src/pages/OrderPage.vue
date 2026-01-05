<script setup lang="ts">
import AppPage from '@/components/AppPage.vue';
</script>

<template>
  <AppPage title="Order Details">
    <div class="content">
      <h1>📦 Order #12345</h1>
      <p>Thank you for your order!</p>

      <div class="card">
        <div class="row">
          <span>Item:</span>
          <span>Premium Plan</span>
        </div>
        <div class="row">
          <span>Price:</span>
          <span>$50.00</span>
        </div>
        <div class="row">
          <span>Status:</span>
          <span style="color: green">Paid</span>
        </div>
      </div>

    </div>
  </AppPage>
</template>

<style scoped>
.content {
  padding: 20px;
  text-align: center;
}
.card {
  margin-top: 20px;
  background: white;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 1.1em;
}
h1 { margin-bottom: 10px; }
</style>
