import {
  type ComponentApi,
  type ComponentContext,
  GenericBinder,
  type InferredComponentApiSchemaType,
  type ResolveA2uiProps,
} from "@a2ui/web_core/v0_9";
import {
  defineComponent,
  onUnmounted,
  type PropType,
  shallowRef,
  type VNode,
  watch,
} from "vue";

/**
 * Props passed to a platform A2UI component's render function.
 * `props` are already resolved by the GenericBinder: `{ path }` bindings and
 * `{ call }` function invocations arrive as plain values.
 */
export interface VueA2uiComponentProps<T> {
  props: T;
  buildChild: (id: string, basePath?: string) => VNode;
  context: ComponentContext;
}

/**
 * A Vue component implementation registered with the A2UI Catalog.
 * Structurally identical to CopilotKit's internal
 * `VueComponentImplementation`, which `@copilotkit/vue` 1.64.1 does not
 * export publicly.
 */
export interface VueComponentImplementation extends ComponentApi {
  render: ReturnType<typeof defineComponent>;
}

/**
 * Minimal local equivalent of CopilotKit's internal `createVueComponent`
 * adapter, scoped to stateless display components: it binds the A2UI
 * ComponentContext to resolved props through the framework-agnostic
 * GenericBinder from `@a2ui/web_core`.
 */
export function createVueComponent<Api extends ComponentApi>(
  api: Api,
  renderFn: (
    componentProps: VueA2uiComponentProps<
      ResolveA2uiProps<InferredComponentApiSchemaType<Api>>
    >,
  ) => VNode | VNode[] | null,
): VueComponentImplementation {
  type Props = ResolveA2uiProps<InferredComponentApiSchemaType<Api>>;

  const render = defineComponent({
    name: `A2UI_${api.name}`,
    props: {
      context: {
        type: Object as PropType<ComponentContext>,
        required: true,
      },
      buildChild: {
        type: Function as PropType<(id: string, basePath?: string) => VNode>,
        required: true,
      },
    },
    setup(wrapperProps) {
      const resolvedProps = shallowRef<Props>({} as Props);
      let binder: GenericBinder<Props> | null = null;

      function initBinder(context: ComponentContext) {
        binder?.dispose();
        binder = new GenericBinder<Props>(context, api.schema);
        resolvedProps.value = binder.snapshot;
        binder.subscribe((newProps: Props) => {
          resolvedProps.value = newProps;
        });
      }

      initBinder(wrapperProps.context);

      watch(
        () => wrapperProps.context,
        (newContext) => {
          initBinder(newContext);
        },
      );

      onUnmounted(() => {
        binder?.dispose();
        binder = null;
      });

      return () =>
        renderFn({
          props: resolvedProps.value,
          buildChild: wrapperProps.buildChild,
          context: wrapperProps.context,
        });
    },
  });

  return {
    name: api.name,
    schema: api.schema,
    render,
  };
}
