import { reactive, watch } from "vue";
import SIGA from "./siga";

const safeParse = (json, defaultValue) => {
  try {
    console.log("Json", json);
    if (json === undefined || json === "" || !json) throw "";
    return JSON.parse(json);
  } catch (e) {
    return defaultValue;
  }
};

export function useApp() {
  const APP = reactive({
    now: new Date(),
    filter: {
      cookie: localStorage.getItem("cookie") || "",
      unidade: localStorage.getItem("unidade") || "",
      startDate:
        localStorage.getItem("startDate") ||
        new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)
          .toISOString()
          .split("T")[0],
      endDate:
        localStorage.getItem("endDate") ||
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
    },
    loading: false,
    error: null,
    message: "",
    enable: false,
    currentIgreja: null,
    activeTab: "Igrejas",
    isFullscreen: false,
    tables: safeParse(localStorage.getItem("tables"), {
      Igrejas: [],
      Eventos: [],
      Fluxos: [],
    }),
    async loadAll() {
      APP.loading = true;
      APP.error = null;
      try {
        await SIGA.login(APP.filter.cookie);
        APP.message =
          "Bem vindo(a) " + SIGA.username + "\n</br>Estamos trabalhando...";
        const result = await SIGA.loadAll(
          APP.filter.startDate,
          APP.filter.endDate,
          APP.filter.unidade
        );
        APP.tables.Igrejas = result.igrejas;
        APP.tables.Eventos = result.eventos;
        APP.tables.Fluxos = result.fluxos;
        localStorage.setItem("tables", JSON.stringify(APP.tables));
        console.log("Result dados SIGA:: ", result);
      } catch (err) {
        console.log("Erro ", err);
        APP.error = err.message;
      } finally {
        APP.loading = false;
      }
    },
  });

  watch(
    () => APP.filter.cookie,
    async (newValue) => {
      try {
        localStorage.setItem("cookie", newValue);
      } catch (error) {
        const msg = "Erro ao logar no SIGA::: " + error;
        console.warn(msg);
        APP.error = msg;
      }
    }
  );

  watch(
    () => APP.filter.startDate,
    async (newValue) => localStorage.setItem("startDate", newValue)
  );

  watch(
    () => APP.filter.endDate,
    async (newValue) => localStorage.setItem("endDate", newValue)
  );

  watch(
    () => APP.filter.unidade,
    async (newValue) => localStorage.setItem("unidade", newValue)
  );

  return {
    APP,
  };
}
