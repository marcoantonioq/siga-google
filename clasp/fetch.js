function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CCB")
    .addItem("📊 Painel", "showSIGA")
    .addToUi();
}
function doGet() {
  return HtmlService.createHtmlOutputFromFile("page");
}

function showSIGA() {
  var html = HtmlService.createHtmlOutputFromFile("page")
    .setTitle("SIGA")
    .setWidth(600);
  SpreadsheetApp.getUi().showSidebar(html);
}

function fetch(requests = { url: "" }) {
  try {
    if (!Array.isArray(requests)) {
      requests = [requests];
    }

    const payloads = requests.map((options) => {
      if (options?.headers?.["Content-Type"]?.includes("multipart/form-data")) {
        const boundary =
          "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        options.headers[
          "Content-Type"
        ] = `multipart/form-data; boundary=${boundary}`;

        let payload = "";
        for (const [key, value] of Object.entries(options.payload)) {
          payload += `--${boundary}\n`;
          payload += `Content-Disposition: form-data; name="${key}"\n\n`;
          payload += `${value}\n`;
        }
        payload += `--${boundary}--\n`;
        options.payload = payload;
      }
      return options;
    });

    const responses = UrlFetchApp.fetchAll(payloads).map((response) => {
      const blob = response.getBlob();
      const headers = response.getHeaders();
      return {
        code: response.getResponseCode(),
        body: response.getContentText(),
        type: blob.getContentType() || headers["Content-Type"],
        blobBytes: blob.getBytes(),
        headers,
      };
    });

    return responses.length === 1 ? responses[0] : responses;
  } catch (error) {
    const msg = `Erro ao processar fetch: ${error}`;
    console.error(msg);
    throw new Error(msg);
  }
}
