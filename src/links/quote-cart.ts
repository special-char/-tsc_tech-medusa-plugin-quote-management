import { defineLink } from "@medusajs/framework/utils";
import QuoteModule from "../modules/quotes";
import CartModule from "@medusajs/medusa/cart";

export default defineLink(
  {
    ...QuoteModule.linkable.quotes,
    field: "cart_id",
  },
  CartModule.linkable.cart,
  {
    readOnly: true,
  }
);
