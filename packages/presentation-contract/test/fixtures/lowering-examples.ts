import type { UIPlan } from "../../src/index.js";

export const summaryPlanExample = {
  version: "1.0",
  scenario: "summary",
  regions: [
    {
      regionId: "overview",
      purpose: "Summarize the account status and key totals.",
      bindings: [
        {
          sourcePointer: "/account",
          role: "content",
        },
      ],
      componentPreferences: [
        {
          componentType: "Card",
          reason: "Group the summary into one semantic region.",
        },
      ],
      layout: {
        flow: "vertical",
        density: "comfortable",
      },
    },
  ],
} satisfies UIPlan;

export const summaryLoweredUIIRExample = {
  surfaceId: "summary-surface",
  rootComponentId: "summary-card",
  components: [
    {
      componentId: "summary-card",
      componentType: "Card",
      props: {
        title: "Account status",
      },
      bindings: {
        content: "/account",
      },
      children: [],
    },
  ],
};

export const formPlanExample = {
  version: "1.0",
  scenario: "form",
  regions: [
    {
      regionId: "profile-form",
      purpose: "Collect editable profile fields.",
      bindings: [
        {
          sourcePointer: "/profile",
          role: "form-data",
        },
      ],
      componentPreferences: [
        {
          componentType: "Form",
          reason: "The user needs to submit structured fields.",
        },
      ],
      layout: {
        flow: "vertical",
        density: "comfortable",
      },
      actions: [
        {
          actionId: "save-profile",
          actionType: "submit",
          label: "Save profile",
          targetRegionId: "profile-form",
          payload: {
            formData: {
              kind: "source-binding",
              sourcePointer: "/profile",
            },
          },
          destructive: false,
          requiresApproval: false,
        },
      ],
    },
  ],
} satisfies UIPlan;

export const formLoweredUIIRExample = {
  surfaceId: "form-surface",
  rootComponentId: "profile-form-component",
  components: [
    {
      componentId: "profile-form-component",
      componentType: "Form",
      props: {
        submitLabel: "Save profile",
      },
      bindings: {
        value: "/profile",
      },
      children: [],
    },
  ],
  actions: [
    {
      actionId: "save-profile",
      actionType: "submit",
      componentId: "profile-form-component",
    },
  ],
};
