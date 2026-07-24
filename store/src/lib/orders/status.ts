import type { OrderStatus } from "@/types/commerce";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  invoice_sent: "Invoice Sent",
  awaiting_payment: "Awaiting ACH/Wire Payment",
  payment_received: "Payment Received",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Valid forward transitions for the order lifecycle. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_review: ["approved", "cancelled"],
  approved: ["invoice_sent", "cancelled"],
  invoice_sent: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["payment_received", "cancelled"],
  payment_received: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function assertValidOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(`Invalid order status transition: ${from} → ${to}`);
  }
}

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["completed", "cancelled"];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}
