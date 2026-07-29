import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type { ComponentDefinition } from "@generative-ui/component-catalog-schema";

type BindingRole =
  UICompileRequest["plan"]["regions"][number]["bindings"][number]["role"];

export interface ComponentMapping {
  purposeProp?: string;
  actionLabelProp?: string;
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
  Button: {
    purposeProp: "label",
    actionLabelProp: "label",
    bindingProps: {},
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
  Form: {
    actionLabelProp: "submitLabel",
    bindingProps: {
      "form-data": "value",
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

const domainComponentMapping: ComponentMapping = {
  bindingProps: {
    title: "title",
    content: "content",
    collection: "items",
    status: "status",
    "form-data": "value",
  },
};

export function componentMapping(
  component: ComponentDefinition,
): ComponentMapping | undefined {
  return component.category === "domain"
    ? domainComponentMapping
    : componentMappings[component.componentType];
}
