import { createApp } from "vue";
import App from "./app/App.vue";
import PrototypeIaShell from "./prototype/PrototypeIaShell.vue";
import "./styles.css";

// PROTOTYPE(issue #174):抛壳路由,仅开发期使用,捕获后随原型一并移除。
const rootComponent =
  window.location.pathname === "/prototype-ia" ? PrototypeIaShell : App;

createApp(rootComponent).mount("#app");
