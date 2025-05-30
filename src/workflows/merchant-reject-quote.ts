import { emitEventStep, useQueryGraphStep } from "@medusajs/core-flows";
import { createWorkflow } from "@medusajs/workflows-sdk";
import { validateQuoteNotAccepted } from "./steps/validate-quote-not-accepted";
import { updateQuotesStep } from "./steps/update-quotes";
import { QuoteStatus } from "../modules/quotes";

type WorkflowInput = {
  quote_id: string;
};

export const merchantRejectQuoteWorkflow = createWorkflow(
  "merchant-reject-quote-workflow",
  (input: WorkflowInput) => {
    // @ts-ignore
    const { data: quotes } = useQueryGraphStep({
      entity: "quotes",
      fields: ["id", "status", "draft_order_id", "*"],
      filters: { id: input.quote_id },
      options: {
        throwIfKeyNotFound: true,
      },
    });

    validateQuoteNotAccepted({
      // @ts-ignore
      quote: quotes[0],
    });

    updateQuotesStep([
      {
        id: input.quote_id,
        status: QuoteStatus.REJECTED,
      },
    ]);

    //event trigger
    emitEventStep({
      eventName: "quote.rejected",
      data: { id: quotes[0].draft_order_id },
    });
  }
);
