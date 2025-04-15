import { model } from "@medusajs/framework/utils";

export const Quote = model.define("quotes", {
  id: model.id({ prefix: "quote" }).primaryKey(),

  status: model
    .enum(["pending", "accepted", "rejected", "expired"])
    .default("pending"),
  customer_id: model.text(),
  draft_order_id: model.text(),
  order_change_id: model.text(),
  cart_id: model.text(),
  valid_till: model.dateTime().nullable(),
  notes: model.text().nullable(),
});
