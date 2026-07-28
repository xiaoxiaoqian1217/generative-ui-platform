import type { UICompileRequest } from "@generative-ui/compiler-contract";

type BindingRole =
  UICompileRequest["plan"]["regions"][number]["bindings"][number]["role"];

export interface ComponentMapping {
  purposeProp?: string;
  bindingProps: Partial<Record<BindingRole, string>>;
}

export const componentMappings: Readonly<Record<string, ComponentMapping>> = {
  Alert: {
    purposeProp: "message",
    bindingProps: {
      title: "title",
      content: "message",
      status: "status",
    },
  },
  Card: {
    purposeProp: "title",
    bindingProps: {
      title: "title",
      content: "content",
      collection: "content",
      status: "status",
    },
  },
  List: {
    bindingProps: {
      title: "title",
      content: "items",
      collection: "items",
    },
  },
  Steps: {
    bindingProps: {
      title: "title",
      content: "steps",
      collection: "steps",
      status: "status",
    },
  },
  Table: {
    bindingProps: {
      title: "title",
      content: "rows",
      collection: "rows",
      status: "rows",
    },
  },
  Text: {
    purposeProp: "text",
    bindingProps: {
      title: "text",
      content: "text",
      status: "text",
    },
  },
  Timeline: {
    bindingProps: {
      title: "title",
      content: "items",
      collection: "items",
      status: "status",
    },
  },
};
