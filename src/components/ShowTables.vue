<template>
  <div v-show="titlesTab.length">
    <div class="tabs">
      <button v-for="title in titlesTab" :key="title" @click="activeTab = title"
        :class="{ active: activeTab === title }">
        {{ title }} ({{ tables[title].length }})
      </button>
    </div>
    <div class="tab-content">
      <div v-for="title in titlesTab" :key="title" v-show="activeTab === title">
        <table v-if="tables[title].length" @click="copyTable(tables[title])">
          <thead>
            <tr>
              <th v-for="(key, index) in Object.keys(tables[title][0])" :key="index">
                {{ key.toUpperCase() }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in tables[title]" :key="r">
              <td v-for="(value, v) in Object.values(row)" :key="v">
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps } from 'vue';

const props = defineProps({
  tables: {
    type: Object,
    required: false
  }
});

const tables = ref(props.tables || {});
const titlesTab = Object.keys(tables.value);
const activeTab = ref(titlesTab[0]);

const copyTable = (data) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const tsvData = [
    headers.join("\t"),
    ...data.map((row) =>
      headers.map((header) => row[header] || "").join("\t")
    ),
  ].join("\n");

  navigator.clipboard.writeText(tsvData)
    .then(() => {
      console.log("Dados copiados para clipboard: ", tsvData);
    })
    .catch((err) => {
      console.error("Erro ao copiar os dados:", err);
    });
};
</script>

<style scoped>
.tabs {
  display: flex;
  margin: 20px 0 0;
}

.tabs button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  color: #6b6b6b;
  background: #f1f1f1;
  margin-right: -1px;
  cursor: pointer;
  border-radius: 10px 10px 0 0;
}

.tabs button.active {
  background: #fff;
  border-bottom: 2px solid #fff;
  font-weight: bold;
  color: #141414 !important;
}

.tab-content {
  padding: 15px;
  background: #fff;
  min-height: 600px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th,
td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

tr:hover {
  background-color: #f1f1f1;
}
</style>
