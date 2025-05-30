import {
  beginOrderEditOrderWorkflow,
  createOrderWorkflow,
  CreateOrderWorkflowInput,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { OrderStatus } from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/workflows-sdk";
import { CreateOrderLineItemDTO } from "@medusajs/framework/types";
import { createQuotesStep } from "./steps/create-quotes";

type WorkflowInput = {
  cart_id?: string;
  customer_id?: string;
  region_id?: string;
  variant_id?: string;
  quantity?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  note?: string;
};

export const createRequestForQuoteWorkflow = createWorkflow(
  "create-request-for-quote",
  (input: WorkflowInput) => {
    let customer_id = input.customer_id || null;
    let cart_id = input?.cart_id || null;
    if (!cart_id || !customer_id) {
      throw new Error("Failed to create customer or cart.");
    }
    // @ts-ignore
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: [
        "id",
        "sales_channel_id",
        "currency_code",
        "region_id",
        "customer.id",
        "customer.email",
        "shipping_address.*",
        "billing_address.*",
        "items.*",
        "shipping_methods.*",
        "promotions.code",
        "metadata",
      ],
      filters: { id: cart_id },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "customer"],
      filters: { id: customer_id },
      options: {
        throwIfKeyNotFound: true,
      },
    }).config({ name: "customer-query" });

    const orderInput = transform(
      { carts, customers },
      ({ carts, customers }) => {
        return {
          is_draft_order: true,
          status: OrderStatus.DRAFT,
          sales_channel_id: carts[0].sales_channel_id || undefined,
          email: customers[0].email || undefined,
          customer_id: customers[0].id || undefined,
          billing_address: carts[0].billing_address,
          shipping_address: carts[0].shipping_address,
          items: (carts[0].items as CreateOrderLineItemDTO[]) || [],
          region_id: carts[0].region_id || undefined,
          promo_codes: carts[0].promotions?.map((promo) => promo?.code),
          currency_code: carts[0].currency_code,
          shipping_methods: carts[0].shipping_methods || [],
          metadata: carts[0].metadata,
        } as CreateOrderWorkflowInput;
      }
    );

    const draftOrder = createOrderWorkflow.runAsStep({
      input: orderInput,
    });

    const orderEditInput = transform({ draftOrder }, ({ draftOrder }) => {
      return {
        order_id: draftOrder.id,
        description: "",
        internal_note: "",
        metadata: {},
      };
    });

    const changeOrder = beginOrderEditOrderWorkflow.runAsStep({
      input: orderEditInput,
    });

    const quoteData = transform(
      {
        draftOrder,
        carts,
        customers,
        changeOrder,
      },
      ({ draftOrder, carts, customers, changeOrder }) => {
        return {
          draft_order_id: draftOrder.id,
          cart_id: carts[0].id,
          customer_id: customers[0].id,
          order_change_id: changeOrder.id,
          note: input.note || "",
        };
      }
    );

    const quotes = createQuotesStep([quoteData]);

    return new WorkflowResponse({ quote: quotes[0] });
  }
);
