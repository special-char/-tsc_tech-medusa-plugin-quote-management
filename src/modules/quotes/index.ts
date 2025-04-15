import { Module } from "@medusajs/framework/utils";
import QuoteModuleService from "./service";

export const QUOTE_MODULE = "quote";
export enum QuoteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
}
export default Module(QUOTE_MODULE, {
  service: QuoteModuleService,
});
