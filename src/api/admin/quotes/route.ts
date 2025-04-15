import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CreateQuoteType } from "./validators";
import {
  createCartWorkflow,
  orderEditUpdateItemQuantityWorkflow,
} from "@medusajs/medusa/core-flows";
import { createRequestForQuoteWorkflow } from "../../../workflows/create-request-for-quote";
import { merchantUpdateQuoteWorkflow } from "../../../workflows/update-quote";
import { merchantSendQuoteWorkflow } from "../../../workflows/merchant-send-quote";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: quotes, metadata } = await query.graph({
    entity: "quotes",
    ...req.queryConfig,
  });

  res.json({
    quotes,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  console.log("cart_id");
  //create cart
  const cart = await createCartWorkflow(req.scope).run({
    input: {
      region_id: req.body.region_id,
      items: [
        {
          variant_id: req.body.variant_id,
          quantity: req.body.quantity || 0,
        },
      ],
      customer_id: req.body.customer_id,
    },
  });
  let cart_id = cart.result.id;

  const {
    result: { quote: createdQuote },
  } = await createRequestForQuoteWorkflow(req.scope).run({
    input: {
      customer_id: req.body.customer_id,
      cart_id,
    },
  });
  await merchantUpdateQuoteWorkflow(req.scope).run({
    input: {
      quote_id: createdQuote.id,
      valid_till: new Date(req.body.valid_till),
    },
  });
  const { data: order } = await query.graph({
    entity: "orders",
    filters: { id: createdQuote.draft_order_id },
    fields: ["id", "items.*"],
  });

  const { result } = await orderEditUpdateItemQuantityWorkflow(req.scope).run({
    input: {
      order_id: createdQuote.draft_order_id,
      items: [
        {
          quantity: req.body.quantity,
          unit_price: req.body.unit_price,
          id: order[0].items[0].id,
        },
      ],
    },
  });

  await merchantSendQuoteWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      quote_id: createdQuote.id,
    },
  });

  const { data: quotes, metadata } = await query.graph({
    entity: "quotes",
    filters: { id: createdQuote.id },
    ...req.queryConfig,
  });

  res.json({
    quotes,
  });
};
