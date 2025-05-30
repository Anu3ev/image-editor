export const presets = [
  ['@babel/preset-env', {
    modules: false, // НЕ преобразовывать ES модули в CommonJS
    targets: { esmodules: true }
  }]
]
