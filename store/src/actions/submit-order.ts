"use server";

import { submitOrderRequest } from "@/lib/orders/submit-order";
import { isSupabaseConfigured } from "@/lib/env";
import type { OrderRequestPayload } from "@/types/commerce";

export type SubmitOrderActionResult =
  | { success: true; orderNumber: string; invoiceNumber: string }
  | { success: false; error: string };

export async function submitOrderAction(
  payload: OrderRequestPayload,
): Promise<SubmitOrderActionResult> {
  try {
    if (!payload.lines.length) {
      return { success: false, error: "Your cart is empty." };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          "Order submission requires Supabase to be configured. Add your environment variables and run migrations.",
      };
    }

    const result = await submitOrderRequest(payload);
    return {
      success: true,
      orderNumber: result.orderNumber,
      invoiceNumber: result.invoiceNumber,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit order.";
    return { success: false, error: message };
  }
}
