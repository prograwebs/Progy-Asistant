import {
  createBooking,
  createOrder,
  parseBooking,
  parseOrder,
  sendEmailNotification,
  transferToHuman,
  type AssistantActionOptions,
  type AssistantActionResult,
} from "@/lib/assistant/actions";
import { type DataRequest, supabaseDataRequest } from "@/lib/data/supabase";
import type { AgentContext } from "@/lib/assistant/context";

export type OpenAITool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: true;
};

type RegistryTool = {
  code?: unknown;
  name?: unknown;
  description?: unknown;
  parameters_schema?: unknown;
  requires_feature_code?: unknown;
  handler_key?: unknown;
  is_active?: unknown;
};

function enabledFeature(context: AgentContext, code: string) {
  return context.features.some((feature) => feature.feature_code === code && feature.enabled !== false);
}

function jsonObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function toolParameters(value: unknown) {
  const schema = jsonObject(value);
  // Accepting a complete function definition here makes the registry tolerant
  // of early seeds while the table contract remains parameters_schema.
  const parameters = schema?.type === "function" ? schema.parameters : schema;
  return jsonObject(parameters);
}

export function getEnabledToolsForBusiness(context: AgentContext): OpenAITool[] {
  const settings = new Map(
    context.businessToolSettings.map((setting) => [String(setting.tool_code || ""), setting]),
  );

  return context.agentTools.flatMap((rawTool) => {
    const tool = rawTool as RegistryTool;
    const code = typeof tool.code === "string" ? tool.code : "";
    const name = typeof tool.name === "string" ? tool.name : code;
    const description = typeof tool.description === "string" ? tool.description : "";
    const handlerKey = typeof tool.handler_key === "string" ? tool.handler_key : "";
    const parameters = toolParameters(tool.parameters_schema);
    if (!code || !name || !description || !handlerKey || !parameters || tool.is_active === false) return [];

    const requiredFeature = typeof tool.requires_feature_code === "string" ? tool.requires_feature_code : "";
    // Booking supports both appointment and reservation features, which share
    // one handler but intentionally have different feature flags by niche.
    const featureAvailable = code === "create_booking"
      ? enabledFeature(context, "schedule_appointments") || enabledFeature(context, "create_reservations")
      : !requiredFeature || enabledFeature(context, requiredFeature);
    if (!featureAvailable) return [];

    const setting = settings.get(code);
    if (setting?.enabled === false) return [];
    return [{ type: "function", name: code, description, parameters, strict: true }];
  });
}

type ToolHandler = (
  context: AgentContext,
  args: unknown,
  request: DataRequest,
  options: AssistantActionOptions,
) => Promise<AssistantActionResult>;

const handlers: Record<string, ToolHandler> = {
  create_order: async (context, args, request, options) => {
    const order = parseOrder(args);
    return order
      ? createOrder(context, order, request, options)
      : { type: "order", executed: false, message: "No pude validar los datos del pedido. Necesito confirmarlos nuevamente." };
  },
  create_booking: async (context, args, request, options) => {
    const booking = parseBooking(args);
    return booking
      ? createBooking(context, booking, request, options)
      : { type: "booking", executed: false, message: "No pude validar la fecha y hora de la reserva. Necesito confirmarlas nuevamente." };
  },
  transfer_to_human: transferToHuman,
  send_email: sendEmailNotification,
};

async function recordToolAction(
  request: DataRequest,
  context: AgentContext,
  toolCode: string,
  args: unknown,
  result: AssistantActionResult,
  conversationId?: string | null,
) {
  if (!conversationId) {
    console.warn("Progy tool action could not be audited without a conversation", { toolCode });
    return;
  }
  try {
    await request("agent_actions", {
      method: "POST",
      body: JSON.stringify({
        business_id: String(context.business.id),
        conversation_id: conversationId,
        action_name: toolCode,
        input_data: args && typeof args === "object" ? args : {},
        output_data: result,
        succeeded: result.executed,
        error_message: result.executed ? null : result.message || "La herramienta no se ejecutó.",
      }),
      prefer: "return=minimal",
    });
  } catch (error) {
    // Auditing must not make a valid customer response fail, but the failure is
    // visible in server logs for operational follow-up.
    console.error("Progy tool action audit failed", {
      businessId: String(context.business.id),
      toolCode,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function executeTool(
  handlerKey: string,
  context: AgentContext,
  args: unknown,
  request: DataRequest = supabaseDataRequest,
  options: AssistantActionOptions & { toolCode?: string } = {},
): Promise<AssistantActionResult> {
  const handler = handlers[handlerKey];
  const toolCode = options.toolCode || handlerKey;
  const configuredTool = context.agentTools.find((tool) => String(tool.code || "") === toolCode);
  const toolEnabled = configuredTool && getEnabledToolsForBusiness(context).some((tool) => tool.name === toolCode);
  let result: AssistantActionResult;
  if (!toolEnabled) {
    result = { type: "none", executed: false, message: "Esta herramienta no está habilitada para este negocio." };
  } else if (!handler) {
    result = { type: "none", executed: false, message: "Esta herramienta todavía no está disponible." };
  } else {
    try {
      result = await handler(context, args, request, options);
    } catch (error) {
      console.error("Progy tool execution failed", {
        businessId: String(context.business.id),
        toolCode,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      result = { type: "none", executed: false, message: "No pude completar esta acción en este momento." };
    }
  }
  await recordToolAction(request, context, toolCode, args, result, options.conversationId);
  return result;
}
