import type { UICompileRequest } from "@generative-ui/compiler-contract";
import type { ComponentDefinition } from "@generative-ui/component-catalog-schema";

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

export function resolveComponentMapping(
  component: ComponentDefinition,
  bindingRoles: readonly BindingRole[],
): ComponentMapping | undefined {
  const builtInMapping = componentMappings[component.componentType];
  if (builtInMapping) {
    return builtInMapping;
  }

  if (component.category !== "domain" || bindingRoles.length !== 1) {
    return undefined;
  }

  const required = component.propsSchema.required;
  const properties = component.propsSchema.properties;
  const prop = required?.length === 1 ? required[0] : undefined;
  if (
    typeof prop !== "string" ||
    properties === undefined ||
    !Object.hasOwn(properties, prop)
  ) {
    return undefined;
  }

  const role = bindingRoles[0];
  if (!role) {
    return undefined;
  }
  return {
    bindingProps: {
      [role]: prop,
    },
  };
}
