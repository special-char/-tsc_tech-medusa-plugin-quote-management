import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CreateQuoteType } from "./validators";
import { createCartWorkflow } from "@medusajs/medusa/core-flows";
import { createRequestForQuoteWorkflow } from "../../../workflows/create-request-for-quote";

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
  req: MedusaRequest<CreateQuoteType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  //
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
