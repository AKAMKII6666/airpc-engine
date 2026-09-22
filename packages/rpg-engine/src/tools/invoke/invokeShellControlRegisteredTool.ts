import { engineError, isEngineError, type EngineError } from "../../host/errors.js";
import type { ShellControlToolResult } from "../../host/shellControl/shellControlTypes.js";
import type { CallSession } from "../../host/types.js";
import type { HangupReasonKind } from "../../schema/call/callCard.js";
import { REQUEST_HANGUP_TOOL_ID } from "../registry/toolRegistry.js";
import type { ToolInvokeResult } from "../types.js";

export type ShellControlInvoker = (
  sessionId: string,
  toolId: string,
  args?: Record<string, unknown>,
) => ShellControlToolResult | EngineError;

function requestHangupReasonKind(
  args: Record<string, unknown>,
): HangupReasonKind | EngineError {
  const raw = args.reasonKind;
  if (raw === "natural" || raw === "policy" || raw === "handoff") return raw;
  return engineError(
    "VALIDATION_FAILED",
    "request_hangup.reasonKind must be natural, policy, or handoff",
    { rule: "TOOL_ARGS_INVALID" },
  );
}

function hasReferralCandidate(session: CallSession): boolean {
  return session.exitCandidates.some(function (candidate) {
    return (
      candidate.toolId === "refer_to_expert" ||
      candidate.toolId === "share_expert_number"
    );
  });
}

function validateHangupGuards(
  session: CallSession,
  args: Record<string, unknown>,
): HangupReasonKind | EngineError {
  const userHasSpoken = session.chatTurns?.some(function (turn) {
    return turn.role === "user";
  });
  if (!userHasSpoken) {
    return engineError(
      "VALIDATION_FAILED",
      "request_hangup is unavailable before the user has spoken",
      { rule: "TOOL_HANGUP_BEFORE_USER" },
    );
  }
  const reasonKind = requestHangupReasonKind(args);
  if (isEngineError(reasonKind)) return reasonKind;
  const configured = session.frozenCard.toolPolicy?.options?.request_hangup
    ?.allowedReasonKinds ?? ["natural", "policy"];
  if (!configured.includes(reasonKind)) {
    return engineError(
      "VALIDATION_FAILED",
      `request_hangup reasonKind not allowed by card: ${reasonKind}`,
      { rule: "TOOL_HANGUP_REASON_POLICY" },
    );
  }
  if (reasonKind === "handoff" && !hasReferralCandidate(session)) {
    return engineError(
      "VALIDATION_FAILED",
      "request_hangup handoff requires a registered referral candidate",
      { rule: "TOOL_HANGUP_HANDOFF_GUARD" },
    );
  }
  return reasonKind;
}

export function invokeShellControlRegisteredTool(input: {
  session: CallSession;
  toolId: string;
  args: Record<string, unknown>;
  invokeShellControlTool: ShellControlInvoker;
}): ToolInvokeResult | EngineError {
  if (input.toolId !== REQUEST_HANGUP_TOOL_ID) {
    return engineError(
      "ENGINE_INTERNAL",
      `unsupported shell control tool: ${input.toolId}`,
    );
  }
  const reasonKind = validateHangupGuards(input.session, input.args);
  if (isEngineError(reasonKind)) return reasonKind;
  const result = input.invokeShellControlTool(
    input.session.sessionId,
    input.toolId,
    { ...input.args, reasonKind },
  );
  if (isEngineError(result)) return result;
  input.session.toolTrace.push({
    at: result.event.createdAt,
    toolId: input.toolId,
    behavior: "shell_control",
    reasonKind,
    eventId: result.event.eventId,
  });
  return {
    ok: true,
    behavior: "shell_control",
    localResult: result.resultForLlm,
  };
}
