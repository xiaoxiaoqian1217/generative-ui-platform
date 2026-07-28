import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type { ComponentDefinition } from "@generative-ui/component-catalog-schema";

type BindingRole =
  UICompileRequest["plan"]["regions"][number]["bindings"][number]["role"];

export interface ComponentMapping {
  purposeProp?: string;
  actionLabelProp?: string;
  bindingProps: Partial<Record<BindingRole, string>>;
}

const commonComponentMappings: Readonly<Record<string, ComponentMapping>> = {
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
      collection: "items",
    },
  },
  Text: {
    bindingProps: {
      title: "text",
      content: "text",
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
    : commonComponentMappings[component.componentType];
}
