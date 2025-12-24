import { z } from "zod";

export const alertTriggerSchema = z.object({
  type: z.enum(["totalNodesDrop", "healthyPercentBelow", "criticalPercentAbove", "avgUsagePercentAbove"]),
  percent: z
    .number()
    .nonnegative()
    .max(100, { message: "percent should be <= 100" }),
  cooldownMinutes: z
    .number()
    .int()
    .min(1)
    .max(2880)
    .optional(),
});

export const alertWebhookSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9._:-]+$/, { message: "Use alphanumeric, dash, dot, colon, or underscore" }),
  label: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .optional(),
  url: z.string().trim().url({ message: "Provide a valid https:// URL" }),
  secret: z
    .string()
    .trim()
    .min(3)
    .max(256)
    .optional(),
  isEnabled: z.boolean().optional(),
  triggers: z.array(alertTriggerSchema).min(1).max(8),
});

export type AlertTrigger = z.infer<typeof alertTriggerSchema>;
export type AlertWebhookConfig = z.infer<typeof alertWebhookSchema>;
