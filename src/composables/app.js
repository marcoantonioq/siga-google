import { reactive, watch } from "vue";
import SIGA from "../core/siga";

SIGA.setFetchGoogle();

const safeLocal = (key, defaultValue) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) throw "";
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
};

export const state = reactive({
  now: new Date(),
  filter: {
    cookie: "",
    unidade: safeLocal("unidade", ""),
    startDate: safeLocal(
      "startDate",
      new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)
        .toISOString()
        .split("T")[0]
    ),
    endDate: safeLocal(
      "endDate",
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]
    ),
  },
  loading: false,
  error: null,
  message: "",
  enable: false,
  currentIgreja: null,
  activeTab: "Igrejas",
  isFullscreen: false,
  tables: safeLocal("tables", {
    Igrejas: [],
    Eventos: [],
    Fluxos: [],
  }),
});

state.filter.cookie = safeLocal("cookie", "");

export async function loadAll() {
  state.loading = true;
  state.error = null;
  try {
    await SIGA.login(state.filter.cookie);
    state.message =
      "Bem vindo(a) " + SIGA.username + "\n</br>Estamos trabalhando...";
    const result = await SIGA.loadAll(
      state.filter.startDate,
      state.filter.endDate,
      state.filter.unidade
    );
    state.tables.Igrejas = result.igrejas;
    state.tables.Eventos = result.eventos;
    state.tables.Fluxos = result.fluxos;
    localStorage.setItem("tables", JSON.stringify(state.tables));
    console.log("Dados SIGA carregados: ", result);
  } catch (err) {
    console.log("Erro: ", err);
    state.error = err.message;
  } finally {
    state.loading = false;
  }
}

watch(
  () => state.filter.cookie,
  (newValue) => localStorage.setItem("cookie", newValue)
);
watch(
  () => state.filter.startDate,
  (newValue) => localStorage.setItem("startDate", newValue)
);
watch(
  () => state.filter.endDate,
  (newValue) => localStorage.setItem("endDate", newValue)
);
watch(
  () => state.filter.unidade,
  (newValue) => localStorage.setItem("unidade", newValue)
);
