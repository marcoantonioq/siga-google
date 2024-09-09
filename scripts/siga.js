import { SIGA } from "../src/core/siga.js";
import dotenv from "dotenv";

dotenv.config();

const APP = {
  tables: {
    Igrejas: [],
    Eventos: [],
    Fluxos: [],
  },
  filter: {
    cookie: process.env.COOKIE || "",
    unidade: "",
    startDate: "2024-06-01",
    endDate: "2024-09-01",
  },
};

export async function loadAll() {
  try {
    await SIGA.login(APP.filter.cookie);
    const result = await SIGA.loadAll(
      APP.filter.startDate,
      APP.filter.endDate,
      APP.filter.unidade
    );
    console.log("Result dados SIGA:: ", result);
  } catch (err) {
    console.error("!!!Erro ao processar o siga: ", err);
  }
}

loadAll();
