import {
  confirmOrderEditRequestWorkflow,
  emitEventStep,
  updateOrderWorkflow,
  useQueryGraphStep,
} from "@medusajs/core-flows";
import { createWorkflow } from "@medusajs/workflows-sdk";
import { updateQuotesStep } from "./steps/update-quotes";
import { validateQuoteNotAccepted } from "./steps/validate-quote-not-accepted";
import { QuoteStatus } from "../modules/quotes";
import { OrderStatus, OrderWorkflowEvents } from "@medusajs/framework/utils";

type WorkflowInput = {
  quote_id: string;
  customer_id?: string;
};

export const merchantSendQuoteWorkflow = createWorkflow(
  "merchant-send-quote-workflow",
  (input: WorkflowInput) => {
    const { data: quotes } = useQueryGraphStep({
      entity: "quotes",
      fields: ["*"],
      filters: { id: input.quote_id },
    });

    validateQuoteNotAccepted({
      // @ts-ignore
      quote: quotes[0],
    });

    updateQuotesStep([
      {
        id: input.quote_id,
        status: QuoteStatus.ACCEPTED,
      },
    ]);

    //event trigger
    emitEventStep({
      eventName: "quote.sent",
      data: { id: quotes[0].draft_order_id, quote_id: input.quote_id },
    });

    updateOrderWorkflow.runAsStep({
      input: {
        id: quotes[0].draft_order_id,
        // @ts-ignore
        status: OrderStatus.PENDING,
        is_draft_order: false,
      },
    });

    confirmOrderEditRequestWorkflow.runAsStep({
      input: {
        order_id: quotes[0].draft_order_id,
        confirmed_by: input.customer_id,
      },
    });
  }
);
