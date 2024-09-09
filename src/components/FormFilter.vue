<template>
    <div class="progress-bar" :class="{ 'is-loading': state.loading }"></div>
    <h1>SIGA</h1>

    <div class="form-group">
        <label for="cookie">Cookie de Navegação:</label>
        <input type="text" id="cookie" v-model="state.filter.cookie" placeholder="Digite o cookie de navegação"
            :disabled="state.loading" />
    </div>

    <div class="form-group">
        <label for="startDate">Data de Início</label>
        <input type="date" id="startDate" v-model="state.filter.startDate" :disabled="state.loading" />
    </div>

    <div class="form-group">
        <label for="endDate">Data de Término</label>
        <input type="date" id="endDate" v-model="state.filter.endDate" :disabled="state.loading" />
    </div>

    <div class="form-group">
        <label for="endDate">Unidade / Igreja / ADM / SEC</label>
        <input type="text" id="endDate" v-model="state.filter.unidade" :disabled="state.loading" />
    </div>

    <button class="success" @click="loadAll" :disabled="state.loading">
        Carregar
    </button>

    <div v-if="state.loading" v-html="state.message"></div>
    <div v-if="state.error" style="color: red">{{ state.error }}</div>
</template>

<script setup>
import { state, loadAll } from '../composables/app.js';


</script>