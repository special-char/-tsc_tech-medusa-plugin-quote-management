import { defineLink } from "@medusajs/framework/utils";
import QuoteModule from "../modules/quotes";
import OrderModule from "@medusajs/medusa/order";

export default defineLink(
  {
    linkable:QuoteModule.linkable.quotes,
    field: "order_change_id",
  },
  OrderModule.linkable.orderChange,
  {
    readOnly: true,
  }
);
