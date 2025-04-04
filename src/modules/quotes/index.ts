import { Module } from "@medusajs/framework/utils";
import QuoteModuleService from "./service";

export const QUOTE_MODULE = "quote";
export enum QuoteStatus {
  PENDING_MERCHANT = "pending_merchant",
  PENDING_CUSTOMER = "pending_customer",
  ACCEPTED = "accepted",
  CUSTOMER_REJECTED = "customer_rejected",
  MERCHANT_REJECTED = "merchant_rejected",
}
export default Module(QUOTE_MODULE, {
  service: QuoteModuleService,
});
