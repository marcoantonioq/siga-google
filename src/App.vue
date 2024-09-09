<template>
  <div>
    <FormFilter />
    <ShowTables :tables="state.tables" />
    <pre>
{{ state }}
    </pre>
  </div>
</template>

<script setup>

import { state } from './composables/app.js';
import ShowTables from "./components/ShowTables.vue"
import FormFilter from "./components/FormFilter.vue"


</script>

<style>
html {
  min-width: 600px;
  font-size: 12px;
}

body,
#app {
  font-family: "Roboto", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
  padding: 20px;
  background-color: #f0f0f0;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

button {
  padding: 10px 20px;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  transition: background-color 0.3s ease;
}

button.success {
  background-color: #28a745;
}

button.success:hover {
  background-color: #218838;
}

button.error {
  background-color: #dc3545;
}

button.error:hover {
  background-color: #c82333;
}

button.info {
  background-color: #007bff;
}

button.info:hover {
  background-color: #0069d9;
}

button.alert {
  background-color: #ffc107;
  color: #212529;
}

button.alert:hover {
  background-color: #e0a800;
}
</style>
