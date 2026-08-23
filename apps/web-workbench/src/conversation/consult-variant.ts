import { ref } from "vue";

/**
 * Development-only comparison variants for the patrol-route consultation.
 *
 * Variant C is the accepted product interaction and therefore the default.
 * Variants A and B remain addressable so the earlier interaction models can
 * still be compared during development without becoming product defaults.
 */
export type ConsultVariant = "a" | "b" | "c";

const CONSULT_VARIANT_PARAM = "consultVariant";

function readInitialVariant(): ConsultVariant {
  const value = new URLSearchParams(window.location.search).get(
    CONSULT_VARIANT_PARAM,
  );
  return value === "a" || value === "b" ? value : "c";
}

export const consultVariant = ref<ConsultVariant>(readInitialVariant());
