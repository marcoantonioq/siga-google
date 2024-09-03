const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: (config) => {
    config.plugins.delete("preload");
    config.plugins.delete("prefetch");
  },
  configureWebpack: {
    devtool: false,
    optimization: {
      splitChunks: false, 
    },
  },
  filenameHashing: false,
  productionSourceMap: false,
});
