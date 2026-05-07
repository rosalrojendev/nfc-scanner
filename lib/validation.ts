import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(6, "Passcode must be at least 6 characters.")
    .max(128, "Passcode is too long."),
  role: z.enum(["inspector", "admin", "client"]),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const inspectionInputSchema = z.object({
  anchorId: z
    .string()
    .min(2, "Anchor ID is required.")
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Anchor ID can only use letters, digits, and dashes.",
    ),
  inspector: z.string().min(2, "Inspector name is required."),
  testDate: z.string().min(1, "Test date is required."),
  nextDueDate: z.string().min(1, "Next due date is required."),
  result: z.enum(["pass", "review", "failed"]),
  proofLoad: z.string().max(120, "Proof load text is too long.").optional().default(""),
  drawingRef: z.string().max(120).optional().default(""),
  notes: z.string().max(2000, "Notes are too long.").optional().default(""),
  photos: z.array(z.string()).default([]),
  signature: z.string().nullable().default(null),
});

export type InspectionInput = z.infer<typeof inspectionInputSchema>;

export const inspectionSchema = inspectionInputSchema.extend({
  id: z.string().optional(),
});

export const anchorPatchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  building: z.string().min(1).max(120).optional(),
  location: z.string().min(1).max(160).optional(),
  drawing: z.string().min(1).max(120).optional(),
});

export type AnchorPatchInput = z.infer<typeof anchorPatchSchema>;
