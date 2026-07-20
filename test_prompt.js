const { createCompiler } = require("./dist/src/services/promptCompiler.js") || {};
if (createCompiler) {
  const compiler = createCompiler();
  console.log(compiler.compile({ userMessage: "Привет, Анна!" }));
} else {
  console.log("Not found");
}
