import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { merchantSendQuoteWorkflow } from "../../../../../workflows/merchant-send-quote";
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  await merchantSendQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      customer_id: req.auth_context.actor_id,
      created_by: "by_admin",
    },
  });

  //update cart price so that it can be sent to the customer
  const { data: quotes } = await query.graph({
    entity: "quotes",
    filters: { id },
    fields: ["*", "draft_order.*", "draft_order.items.*"],
  });
  const { data: cart } = await query.graph({
    entity: "cart",
    filters: { id: quotes[0].cart_id },
    fields: ["*", "items.*"],
  });

  if (
    cart[0]?.items[0]?.id &&
    quotes &&
    quotes[0] &&
    quotes[0].draft_order &&
    quotes[0].draft_order.items &&
    quotes[0]?.draft_order?.items[0]?.unit_price != null &&
    cart[0]?.items[0]?.unit_price != null &&
    Number(quotes[0].draft_order.items[0].unit_price) !==
      Number(cart[0].items[0].unit_price)
  ) {
    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id: quotes[0].cart_id,
        item_id: cart[0].items[0]?.id,
        update: {
          unit_price: quotes[0].draft_order.items[0].unit_price,
          quantity: quotes[0].draft_order.items[0].quantity,
        },
      },
    });
  }

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quotes",
      filters: { id },
      fields: req.queryConfig.fields,
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ quote });
};
