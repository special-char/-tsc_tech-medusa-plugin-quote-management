import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { CreateQuoteType } from "./validators";
import {
  createCartWorkflow,
  orderEditUpdateItemQuantityWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { createRequestForQuoteWorkflow } from "../../../workflows/create-request-for-quote";
import { merchantUpdateQuoteWorkflow } from "../../../workflows/update-quote";
import { merchantSendQuoteWorkflow } from "../../../workflows/merchant-send-quote";
import { getLastPaymentStatus } from "./[id]/route";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: quotes, metadata } = await query.graph({
    entity: "quotes",
    ...req.queryConfig,
  });
  const orderModuleService = req.scope.resolve(Modules.ORDER);
  const quoteData: any = [];
  await Promise.all(
    quotes.map(async (e) => {
      const payment_status = getLastPaymentStatus(e.draft_order);
      quoteData.push({ ...e, payment_status });
    })
  );

  res.json({
    quotes: quoteData,
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
      billing_address: req.body.billing_address,
      shipping_address: req.body.shipping_address,
      shipping_address_id: req.body.shipping_address_id,
      billing_address_id: req.body.billing_address_id,
      ...(req.body.gstNumber && {
        metadata: {
          gstNumber: req.body.gstNumber,
        },
      }),
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
  const { data: quotesData } = await query.graph({
    entity: "quotes",
    filters: { id: createdQuote.id },
    fields: ["*", "draft_order.*", "draft_order.items.*"],
  });
  const { data: cartData } = await query.graph({
    entity: "cart",
    filters: { id: quotesData[0].cart_id },
    fields: ["*", "items.*"],
  });

  if (
    quotesData &&
    quotesData[0] &&
    quotesData[0].draft_order &&
    quotesData[0].draft_order.items &&
    quotesData[0]?.draft_order?.items[0]?.unit_price != null &&
    cartData[0]?.items[0]?.unit_price != null &&
    Number(quotesData[0].draft_order.items[0].unit_price) !=
      Number(cartData[0].items[0].unit_price)
  ) {
    console.log("updating line item in cart");

    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id: quotesData[0].cart_id,
        item_id: cartData[0].items[0]?.id,
        update: {
          unit_price: req.body.unit_price,
          quantity: req.body.quantity,
        },
      },
    });
  }
  const { data: quotes, metadata } = await query.graph({
    entity: "quotes",
    filters: { id: createdQuote.id },
    ...req.queryConfig,
  });

  res.json({
    quotes,
  });
};
