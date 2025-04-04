import { defineLink } from "@medusajs/framework/utils";
import QuoteModule from "../modules/quotes";
import CustomerModule from "@medusajs/medusa/customer";

export default defineLink(
  {
    ...QuoteModule.linkable.quotes,
    field: "customer_id",
  },
  CustomerModule.linkable.customer,
  {
    readOnly: true,
  }
);
