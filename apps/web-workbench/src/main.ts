import { createApp } from "vue";
import App from "./app/App.vue";
import PrototypeInspect from "./prototype/PrototypeInspect.vue";
import "./styles.css";

// PROTOTYPE(issue #179):六节点 Execution Map 抛壳路由,仅开发期使用,捕获后随原型一并移除。
const rootComponent =
  import.meta.env.DEV && window.location.pathname === "/prototype-inspect"
    ? PrototypeInspect
    : App;

createApp(rootComponent).mount("#app");
