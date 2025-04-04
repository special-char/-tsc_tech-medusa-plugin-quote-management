import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import { CreateQuote, GetQuoteParams } from "./store/validators";
import { listAdminQuoteQueryConfig } from "./admin/quotes/query-config";
import {
  AdminCreateQuote,
  AdminGetQuoteParams,
} from "./admin/quotes/validators";
import { listStoreQuoteQueryConfig } from "./store/customers/me/quotes/query-config";

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
  ],
});
