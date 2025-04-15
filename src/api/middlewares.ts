import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import { CreateQuote, GetQuoteParams } from "./store/validators";
import { listAdminQuoteQueryConfig } from "./admin/quotes/query-config";
import {
  AdminCreateQuote,
  AdminCreateUpdateQuote,
  AdminGetQuoteParams,
} from "./admin/quotes/validators";
import { listStoreQuoteQueryConfig } from "./store/customers/me/quotes/query-config";
import {
  AdminGetProductVariantsParams,
  setPricingContext,
} from "./admin/product-variant/validators";
import { listProductVariantQueryConfig } from "./admin/product-variant/query-config";

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/customers/quotes",
      middlewares: [
        validateAndTransformBody(CreateQuote),
        validateAndTransformQuery(GetQuoteParams, listStoreQuoteQueryConfig),
      ],
    },
    {
      matcher: "/store/customers/me/quotes*",
      middlewares: [
        validateAndTransformQuery(GetQuoteParams, listStoreQuoteQueryConfig),
      ],
    },
    {
      matcher: "/admin/quotes*",
      middlewares: [
        validateAndTransformQuery(
          AdminGetQuoteParams,
          listAdminQuoteQueryConfig
        ),
      ],
    },
    {
      matcher: "/admin/quotes",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(AdminCreateQuote),
        validateAndTransformQuery(
          AdminGetQuoteParams,
          listAdminQuoteQueryConfig
        ),
      ],
    },
    {
      matcher: "/admin/quotes/:id/update",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(AdminCreateUpdateQuote),
        validateAndTransformQuery(
          AdminGetQuoteParams,
          listAdminQuoteQueryConfig
        ),
      ],
    },

    {
      matcher: "/admin/product-variant",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(
          AdminGetProductVariantsParams,
          listProductVariantQueryConfig
        ),
        setPricingContext(),
      ],
    },
  ],
});
