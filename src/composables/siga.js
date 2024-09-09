import * as XLSX from "xlsx";

export const SIGA = {
  username: "",
  currentIgreja: null,
  cookie: "",
  loading: false,
  error: null,
  igrejas: [],
  fluxos: [],
  eventos: [],
  competencias: [],
  pageLogin: "",

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async fetch(options) {
    this.error = null;
    this.loading = true;
    if (!Array.isArray(options)) {
      options = [options];
    }
    try {
      const requests = options.map((option) => {
        const optionsDefault = {
          headers: {},
          // muteHttpExceptions: true,
          ...option,
        };
        optionsDefault.headers.Cookie = this.cookie || "";
        const matchToken =
          typeof this.cookie === "string"
            ? this.cookie.match(/__AntiXsrfToken=([^;]+)/)?.[1]
            : null;
        optionsDefault.headers["__AntiXsrfToken"] = matchToken || null;
        return optionsDefault;
      });

      const responses = await new Promise((resolve, reject) => {
        // eslint-disable-next-line no-undef
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .fetch(requests);
      });

      return responses.length === 1 ? responses[0] : responses;
    } catch (error) {
      console.error(
        "Erro ao realizar consulta fetch: " + options[0].url + error
      );
      this.error = error;
    } finally {
      this.loading = false;
    }
  },

  betweenDates(dataInicial, dataFinal) {
    const resultado = [];
    const start = new Date(dataInicial);
    const end = new Date(dataFinal);

    let yyyy = start.getUTCFullYear();
    let mm = start.getUTCMonth();

    let data = new Date(Date.UTC(yyyy, mm, 1));

    while (data <= end) {
      const primeiroDia = new Date(
        Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1)
      );
      const ultimoDia = new Date(
        Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)
      );
      resultado.push({
        start: primeiroDia.toISOString().split("T")[0],
        end: ultimoDia.toISOString().split("T")[0],
        ref: primeiroDia
          .toISOString()
          .replace(/(\d\d\d\d)-(\d\d)-\d\d.*/, "$2/$1"),
      });
      mm += 1;
      if (mm > 11) {
        mm = 0;
        yyyy += 1;
      }
      data = new Date(Date.UTC(yyyy, mm, 1));
    }
    return resultado;
  },

  async login(cookie = "") {
    if (cookie) {
      this.cookie = cookie;
    } else {
      throw new Error("Por favor, informe o cookie");
    }

    console.log("Cookie:::", cookie);

    if (this.pageLogin) {
      return this.pageLogin;
    }

    var result = await this.fetch({
      url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx?f_inicio=S",
    });

    if (
      result.body &&
      /(Lembrar meu email\/usuário|acesso ao SIGA para enviarmos um e-mail com uma senha provisória|..\/index.aspx)/gi.test(
        result.body
      )
    ) {
      throw new Error(
        "Você não está logado! Acesse o portal administrativo para enviar o cookie de autenticação..."
      );
    }

    result = await this.fetch({
      url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
    });

    const usuarioMatch = result.body.match(
      /<input[^>]*name="f_usuario"[^>]*value="([^"]*)"/
    );

    if (!usuarioMatch) {
      throw new Error("Não foi possível encontrar o valor do usuário.");
    }

    console.info(">>> ### Bem vindo(a) " + usuarioMatch[1]);
    this.pageLogin = result.body;
    this.username = usuarioMatch[1];

    return this.pageLogin;
  },

  async obterIgrejas() {
    const empresas = [];
    const igrejas = [];
    try {
      const optgroupRegex = /<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g;
      let optgroupMatch;

      const body = await this.login(this.cookie);

      while ((optgroupMatch = optgroupRegex.exec(body)) !== null) {
        const label = optgroupMatch[1];
        const options = optgroupMatch[2];
        const optionRegex =
          /<option value="(\d+)"[^>]*>\s*([^<]+)\s*<\/option>/gs;
        let optionMatch;

        while ((optionMatch = optionRegex.exec(options)) !== null) {
          empresas.push({
            retional: label,
            type: "EMPRESA",
            id: Number(optionMatch[1]),
            description: optionMatch[2].trim(),
          });
        }
      }

      (
        await this.fetch(
          empresas.map((e) => ({
            url: "https://siga.congregacao.org.br/REL/EstabelecimentoWS.asmx/SelecionarParaAcesso",
            method: "post",
            payload: '{ "codigoEmpresa": ' + e.id + "}",
            headers: {
              "Content-Type": "application/json; charset=UTF-8",
            },
          }))
        )
      ).map(({ body }) => {
        JSON.parse(body).d.map((e) => {
          const emp = empresas.find((emp) => emp.id === e["CodigoEmpresa"]);
          igrejas.push({
            cod: e["Codigo"],
            adm: emp.description,
            codUnidade: e["CodigoEmpresa"],
            reg: emp.retional,
            type: e["CodigoTipoEstabelecimento"],
            nome: e["Nome"],
            desc: e["NomeExibicao"],
            membros: 0,
          });
        });
      });
    } catch (error) {
      console.error("!!! Erro ao obter igrejas: ", error);
    }
    this.igrejas = igrejas;
    return igrejas;
  },

  async alterarIgreja(igreja = { cod: 0, codUnidade: 0 }) {
    try {
      if (!this.username) throw new Error("Usuário não identificado!!!");

      const { body: htmlComp } = await this.fetch({
        url: "https://siga.congregacao.org.br/CTB/CompetenciaWS.asmx/SelecionarCompetencias",
        method: "post",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        payload: JSON.stringify({ codigoEmpresa: igreja.codUnidade }),
      });

      this.competencias = JSON.parse(htmlComp).d;

      const result = await this.fetch({
        url: "https://siga.congregacao.org.br/SIS/SIS99906.aspx",
        method: "post",
        payload: {
          gravar: "S",
          f_usuario: this.username.replace(/\r?\n|\r/g, "").trim(),
          f_empresa: igreja.codUnidade,
          f_estabelecimento: igreja.cod,
          f_competencia: this.competencias[0]["Codigo"]
            .replace(/\r?\n|\r/g, "")
            .trim(),
          __jqSubmit__: "S",
        },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      this.currentIgreja = igreja;
      console.info(">>> Igreja alterada para: ", igreja);
      await this.fetch([
        {
          url: "https://siga.congregacao.org.br/SIS/SIS99908.aspx?f_inicio=S",
        },
        {
          url: "https://siga.congregacao.org.br/page.aspx?loadPage=/SIS/SIS99908.aspx?f_inicio=S",
        },
        {
          url: "https://siga.congregacao.org.br/SIS/SIS99908.aspx?f_inicio=S",
        },
      ]);
      return result.body;
    } catch (error) {
      const msg = "!!! Erro ao alterar a igreja:" + error;
      console.error(msg);
      throw new Error(msg);
    }
  },

  async obterFluxoDespesas(startDate, endDate) {
    const despesas = [];
    var result = [];

    try {
      const requestData = {
        f_data1: startDate.split("-").reverse().join("/"),
        f_data2: endDate.split("-").reverse().join("/"),
        f_estabelecimento: this.currentIgreja.cod,
        f_centrocusto: "",
        f_fornecedor: "",
        f_formato: "TES00902.aspx",
        f_saidapara: "Excel",
        f_agrupar: "CentrodeCustoSetor",
        __initPage__: "S",
      };

      const params = Object.keys(requestData)
        .map((key) => key + "=" + encodeURIComponent(requestData[key]))
        .join("&");

      result = await this.fetch({
        url: "https://siga.congregacao.org.br/TES/TES00902.aspx?" + params,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!result) {
        throw new Error("!!! Não possicel acessar Mapa de Coletas!");
      } else if (!["application/vnd.ms-excel"].includes(result.type)) {
        if (result.type.includes("text/html")) {
          throw new Error(
            this.username,
            this.currentIgreja,
            result.body.match(
              /<h3 class="lighter smaller">\s*(.*?)\s*<\/h3>/
            )[0]
          );
        } else {
          throw new Error(
            "!!! Falha ao baixar relatório Mapa de Coletas: " + result
          );
        }
      }

      const values = await this.handleFile(
        new Blob([new Uint8Array(result.blobBytes)], {
          type: "application/octet-stream",
        })
      );

      let Localidade = "",
        Ref = "";

      const igreja = this.currentIgreja;

      values.forEach((row) => {
        try {
          if (Array.isArray(row) && row.length) {
            if (/^Mês \d\d\/\d+/.test(`${row[0]}`)) {
              const [, mm, yyyy] = row[0].match(/(\d{2})\/(\d{4})/);
              Ref = `${mm}/${yyyy}`;
            } else if (
              /^(BR \d+-\d+|^ADM|^PIA|^SET)/.test(`${row[0]}`) ||
              row.length === 1
            ) {
              Localidade = row[0];
            } else if (/^\d+$/.test(`${row[0]}`)) {
              const e = {
                Ref,
                Localidade,
                Data: new Date(
                  new Date(1899, 11, 30).getTime() + row[0] * 86400000
                ),
                Tipo: row[3],
                NumeroDoc: row[4],
                Despesa: row[6],
                Fornecedor: row[8],
                Valor: row[15],
                Multa: row[21],
                Juros: row[24],
                Desconto: row[27],
                Total: row[30],
              };
              despesas.push({
                FLUXO: "Saída",
                REGIONAL: igreja.reg,
                IGREJA: e.Localidade,
                IGREJA_ADM: igreja.adm,
                IGREJA_COD: igreja.cod,
                IGREJA_TIPO: igreja.type,
                IGREJA_DESC: e.Localidade,
                CATEGORIA: e.Despesa,
                DATA: e.Data,
                VALOR: e.Total || 0,
                OBSERVAÇÕES: `${e.Fornecedor}, NF: ${e.NumeroDoc}`,
                REF: e.Ref,
                ORIGEM: "SIGA",
                CREATED: new Date(),
                UPDATED: new Date(),
              });
            }
          }
        } catch (error) {
          console.warn("Falha ao procurar em linhas de despesas: ", error);
        }
      });
    } catch (error) {
      console.error("!!!! Erro ao coletar despesa: Permissão de acesso!");
    }
    return despesas;
  },

  async validaPeriodo(data1, data2) {
    try {
      const request = {
        url: "https://siga.congregacao.org.br/UTIL/UtilWS.asmx/ValidaPeriodo",
        method: "post",
        "Content-Type": "application/json",
        payload: JSON.stringify({
          f_data1: data1.split("T")[0].split("-").reverse().join("/"),
          f_data2: data2.split("T")[0].split("-").reverse().join("/"),
          l_data1: "Data Inicial",
          l_data2: "Data Final",
        }),
        muteHttpExceptions: true,
      };
      await this.fetch(request);
      return true;
    } catch (error) {
      console.warn("Erro ao valiar data: ", data1, data2, error);
      return false;
    }
  },

  async obterFluxoMapaColetas(startDate, endDate) {
    const fluxos = [];
    for (const { start, end, ref } of this.betweenDates(startDate, endDate)) {
      var request = [],
        result = [];
      try {
        await this.fetch({
          method: "get",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx?f_inicio=S",
        });

        await this.validaPeriodo(start, end);

        const f_filtro_relatorio = this.igrejas
          .filter((e) => e.adm === this.currentIgreja.desc)
          .map((e) => e.cod)
          .join(",");

        request = {
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          payload: {
            f_consultar: "S",
            f_data1: start.split("-").reverse().join("/"),
            f_data2: end.split("-").reverse().join("/"),
            f_estabelecimento: "",
            f_filtro_relatorio,
            f_formacontribuicao: "0",
            f_opcao2: "casaoracao",
            f_exibir: "comvalor",
            f_agrupar: "",
            f_detalhar: "true",
            f_saidapara: "Excel",
            f_ordenacao: "alfabetica",
            __initPage__: "S",
            __jqSubmit__: "S",
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };

        result = await this.fetch(request);

        request = {
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00501.aspx",
          payload: {
            f_consultar: "S",
            f_data1: start.split("-").reverse().join("/"),
            f_data2: end.split("-").reverse().join("/"),
            f_estabelecimento: "",
            f_filtro_relatorio,
            f_formacontribuicao: "0",
            f_opcao2: "casaoracao",
            f_exibir: "comvalor",
            f_detalhar: "true",
            f_saidapara: "Excel",
            f_ordenacao: "alfabetica",
            __initPage__: "S",
            __jqSubmit__: "S",
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };

        result = await this.fetch(request);

        if (result.code === 500) {
          console.warn(
            "Falha ao configurar o relatório Mapa de Coletas: ",
            request
          );
          throw (
            "!!! Falha ao configurar o relatório Mapa de Coletas: " +
            result.body
          );
        }

        request = {
          method: "post",
          url: "https://siga.congregacao.org.br/TES/TES00507.aspx",
          payload: "f_saidapara=Excel&__initPage__=S",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        };

        await this.sleep(3000);
        result = [];
        result = await this.fetch(request);

        if (!["application/vnd.ms-excel"].includes(result.type)) {
          if (result.type.includes("text/html")) {
            throw new Error(
              this.username,
              this.currentIgreja,
              result.body.match(
                /<h3 class="lighter smaller">\s*(.*?)\s*<\/h3>/
              )[0]
            );
          } else {
            throw new Error(
              "!!! Falha ao baixar relatório Mapa de Coletas: " + result
            );
          }
        }

        const values = await this.handleFile(
          new Blob([new Uint8Array(result.blobBytes)], {
            type: "application/octet-stream",
          })
        );

        var nomeIgreja = "",
          headers = "",
          tipo = "";

        for (var i = 0; i < values.length; i++) {
          if (/^Total/.test(values[i][0])) {
            nomeIgreja = "";
            continue;
          } else if (/^Todos/.test(values[i][0])) {
            break;
          } else if (/^Casa de Oração/.test(`${values[i][0]}`)) {
            headers = values[i];
          } else if (/^(SET|BR|ADM)/.test(values[i][0])) {
            nomeIgreja = values[i][0];
          }

          if (/^Tipo/.test(values[i][6])) {
            continue;
          } else if (/[a-z]/i.test(values[i][6])) {
            tipo = values[i][6];

            for (let x = 7; x < headers.length; x++) {
              if (headers[x] === "Total") break;
              if (!headers[x] || !/^[1-9]/.test(values[i][x])) continue;

              fluxos.push({
                FLUXO: "Coleta",
                REGIONAL: undefined,
                IGREJA: nomeIgreja,
                IGREJA_ADM: undefined,
                IGREJA_COD: undefined,
                IGREJA_TIPO: undefined,
                IGREJA_DESC: nomeIgreja,
                CATEGORIA: tipo,
                DATA: end,
                VALOR: values[i][x],
                OBSERVAÇÕES: headers[x],
                REF: ref,
                ORIGEM: "SIGA",
                CREATED: new Date(),
                UPDATED: new Date(),
              });
            }
          }
        }
      } catch (error) {
        console.error(
          "!!! Erro ao baixar fluxo de Mapa Coletas: Permissão de acesso!"
        );
      }
    }
    return fluxos;
  },

  async obterFluxoDepositos(startDate, endDate) {
    const fluxos = [];
    try {
      /**
       * Obter copetencias
       */
      const refs = this.betweenDates(startDate, endDate).map((e) => e.ref);

      var result = await this.fetch({
        url: "https://siga.congregacao.org.br/TES/TES00701.aspx?f_inicio=S&__initPage__=S",
      });

      const selectMatch =
        /<select[^>]*id="f_competencia"[^>]*>([\s\S]*?)<\/select>/i.exec(
          result.body
        );

      var competencias = [];

      if (selectMatch) {
        const optionsHtml = selectMatch[1];
        const optionRegex = /<option[^>]*value="([^"]*)".*?>(.*?)<\/option>/gi;
        var match;
        while ((match = optionRegex.exec(optionsHtml)) !== null) {
          if (!match[2].includes("Todos") && refs.includes(match[2])) {
            competencias.push({
              value: match[1],
              description: match[2],
            });
          }
        }
      }

      /**
       * Obter dados
       */
      for (const { value: competencia } of competencias) {
        try {
          var request = {};
          result = null;
          request = {
            url: "https://siga.congregacao.org.br/TES/TES00702.aspx",
            method: "post",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            payload:
              "f_competencia=" +
              competencia +
              "&f_data1=&f_data2=&f_estabelecimento=" +
              this.currentIgreja.cod +
              "&f_saidapara=Excel&f_ordenacao=alfabetica&__initPage__=S",
          };
          try {
            result = [];
            result = await this.fetch(request);
          } catch (error) {
            console.warn(
              "Erro baixar depositos: ",
              this.currentIgreja.desc,
              request,
              result
            );
            throw error;
          }

          if (result && result.code !== 200) {
            console.error(
              "Falha (" +
                result.code +
                ") ao gerar relatório de deposito " +
                result.body
            );
          }

          if (!result) {
            throw new Error("!!! Não possivel acessar Mapa de Coletas!");
          } else if (!["application/vnd.ms-excel"].includes(result.type)) {
            if (result.type.includes("text/html")) {
              throw new Error(
                this.username,
                this.currentIgreja,
                result.body.match(
                  /<h3 class="lighter smaller">\s*(.*?)\s*<\/h3>/
                )[0]
              );
            } else {
              throw new Error(
                "!!! Falha ao baixar relatório Mapa de Coletas: " + result
              );
            }
          }
          const values = await this.handleFile(
            new Blob([new Uint8Array(result.blobBytes)], {
              type: "application/octet-stream",
            })
          );

          var igrejaNome = "";
          var ref = values[9][14];

          for (var i = 0; i < values.length; i++) {
            if (/^(SET|ADM|BR|PIA)/.test(`${values[i][0]}`)) {
              igrejaNome = values[i][0];
            } else if (/^\d\d\/\d{4}/.test(values[i][2])) {
              ref = values[i][2];
              fluxos.push({
                FLUXO: "Deposito",
                REGIONAL: undefined,
                IGREJA: igrejaNome,
                IGREJA_ADM: undefined,
                IGREJA_COD: undefined,
                IGREJA_TIPO: undefined,
                IGREJA_DESC: igrejaNome,
                CATEGORIA: "",
                DATA: values[i][3],
                VALOR: values[i][18],
                OBSERVAÇÕES: values[i][7],
                REF: ref,
                ORIGEM: "SIGA",
                CREATED: new Date(),
                UPDATED: new Date(),
              });
            }
          }
        } catch (error) {
          console.warn(
            "Erro ao processar deposito da competencia " +
              competencia +
              " =>  " +
              error
          );
        }
      }
    } catch (erro) {
      console.warn("FluxoDepositos: ", erro);
    }
    return fluxos;
  },

  async obterEventosSecretaria(startDate, endDate) {
    const eventos = [];
    try {
      const { code, body } = await this.fetch({
        url: "https://siga.congregacao.org.br/REL/REL01701.asmx/SelecionarVW",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        payload: JSON.stringify({
          codigoTipoEvento: null,
          codigoEmpresa: this.currentIgreja.codUnidade,
          codigoEstabelecimento: null,
          data1: startDate.split("-").reverse().join("/"),
          data2: endDate.split("-").reverse().join("/"),
          listaStatus: "4,3",
          config: {
            sEcho: 1,
            iDisplayStart: 0,
            iDisplayLength: 1000,
            sSearch: "",
            iSortCol: 0,
            sSortDir: "asc",
          },
        }),
      });
      const data = JSON.parse(body);
      if (data.d.aaData && code == 200) {
        data.d.aaData
          .map(([DATA, SEMANA, HORA, GRUPO, IGREJA, , STATUS, ID]) => {
            return {
              EVENTO: "Secretaria",
              GRUPO,
              DATA: new Date(`${DATA} ${HORA.split("-")[0].trim()}`),
              IGREJA,
              OBSERVAÇÕES: `${SEMANA}: ${HORA}`,
              STATUS: STATUS.replace(/<\/?[^>]+>/gi, ""),
              ID,
            };
          })
          .forEach((e) => eventos.push(e));
      }
    } catch (erro) {
      console.warn("Erro ao obter Eventos: ", erro);
    }
    console.log("Eventos obtidos: ", eventos);
    return eventos;
  },

  async obterEventosContabilidadeCompetencias() {
    if (this.currentIgreja.type !== 3) return;

    const eventos = [];
    try {
      const { body } = await this.fetch({
        url: "https://siga.congregacao.org.br/CTB/CTB00701.aspx?f_inicio=S&__initPage__=S",
      });

      var regex =
        /<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<span class="icon (icon-folder-[\w-]+)[\s\S]*?<\/span>[\s\S]*?<\/td>[\s\S]*?<\/tr>/g;

      var matches;
      var results = [];

      while ((matches = regex.exec(body)) !== null) {
        var events = {
          "Casa de Oração": matches[2].includes("open") ? "Aberto" : "Fechado",
          Piedade: matches[3].includes("open") ? "Aberto" : "Fechado",
          Administração: matches[4].includes("open") ? "Aberto" : "Fechado",
          "Conselho Fiscal": matches[5].includes("open") ? "Aberto" : "Fechado",
          Contabiliade: matches[6].includes("open") ? "Aberto" : "Fechado",
        };

        const competencia = matches[1].trim().replace(/&nbsp;/g, "");

        Object.keys(events).forEach((grupo) => {
          results.push({
            EVENTO: "Contabilidade Competências",
            GRUPO: grupo,
            DATA: competencia,
            IGREJA: this.currentIgreja.desc,
            OBSERVAÇÕES: "",
            STATUS: events[grupo],
            ID: "",
          });
        });
      }
    } catch (error) {
      console.warn("!!! Erro ao obter fechamentos da contabilidade: ", error);
    }

    return eventos;
  },

  handleFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const arrayData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          });
          resolve(arrayData); // Resolva a Promise com o array de dados
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function (error) {
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async loadAll(startDate, endDate, filter = "") {
    const fluxos = [];
    const eventos = [];
    const igrejas = [];

    var igrejasFiltered = [];

    try {
      (await this.obterIgrejas()).forEach((e) => igrejas.push(e));

      igrejasFiltered = igrejas;

      if (filter) {
        const regex = new RegExp(
          filter
            .split(",")
            .map((e) => e.trim())
            .join("|"),
          "gi"
        );

        igrejasFiltered = igrejas.filter(
          (e) => e.type !== 3 && regex.test(e.desc)
        );

        igrejasFiltered = igrejasFiltered.concat(
          igrejas.filter(
            (e) => e.type === 3 && igrejasFiltered.some((i) => i.adm === e.desc)
          )
        );
      }

      console.log("Igrejas e ADM(s): ", igrejasFiltered.length);

      for (const igreja of igrejasFiltered.filter((i) => i.type === 3)) {
        await this.alterarIgreja(igreja);

        (await this.obterFluxoMapaColetas(startDate, endDate)).forEach((e) =>
          fluxos.push(e)
        );

        (await this.obterFluxoDespesas(startDate, endDate)).forEach((e) =>
          fluxos.push(e)
        );

        (await this.obterFluxoDepositos(startDate, endDate)).forEach((e) =>
          fluxos.push(e)
        );

        (await this.obterEventosSecretaria(startDate, endDate)).forEach((e) =>
          eventos.push(e)
        );

        //     (await this.obterEventosContabilidadeCompetencias()).forEach((e) =>
        //       eventos.push(e)
        //     );

        fluxos.map((e) => {
          const report = igrejas.find((ig) => ig?.desc.includes(e.IGREJA_DESC));
          if (report) {
            e.IGREJA = report.nome;
            e.IGREJA_COD = report.cod;
            e.IGREJA_TIPO = report.type;
            e.COD_REG = report.codUnidade;
            e.REGIONAL = report.reg;
            e.IGREJA_ADM = report.adm;
            e.IGREJA_TIPO = report.type;
            e.IGREJA_DESC = report.desc;
          }
        });

        // break;
      }
      this.igrejas = igrejas;
      this.eventos = eventos;
      this.fluxos = fluxos;
    } catch (err) {
      console.log("!!! Erro geral::: ", err);
      this.error = err.message;
    } finally {
      this.loading = false;
    }
    return {
      igrejas,
      fluxos,
      eventos,
    };
  },
};

export default SIGA;
