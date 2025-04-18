import { useQueryGraphStep } from "@medusajs/core-flows";
import { createWorkflow } from "@medusajs/workflows-sdk";
import { updateQuotesStep } from "./steps/update-quotes";
import { validateQuoteNotAccepted } from "./steps/validate-quote-not-accepted";
import { QuoteStatus } from "../modules/quotes";

type WorkflowInput = {
  quote_id: string;
  customer_id: string;
};

export const customerRejectQuoteWorkflow = createWorkflow(
  "customer-reject-quote-workflow",
  (input: WorkflowInput) => {
    // @ts-ignore
    const { data: quotes } = useQueryGraphStep({
      entity: "quotes",
      fields: ["id", "status"],
      filters: { id: input.quote_id, customer_id: input.customer_id },
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
  }
);
