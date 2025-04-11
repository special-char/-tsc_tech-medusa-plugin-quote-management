import { useQueryGraphStep } from "@medusajs/core-flows";
import { createWorkflow } from "@medusajs/workflows-sdk";
import { updateQuotesStep } from "./steps/update-quotes";
import { validateQuoteNotAccepted } from "./steps/validate-quote-not-accepted";

type WorkflowInput = {
  quote_id: string;
  valid_till?: Date;
  customer_id?: string;
};

export const merchantUpdateQuoteWorkflow = createWorkflow(
  "merchant-update-quote-workflow",
  (input: WorkflowInput) => {
    // @ts-ignore
    const { data: quotes } = useQueryGraphStep({
      entity: "quotes",
      fields: ["id", "status", "*"],
      filters: { id: input.quote_id },
    });
    validateQuoteNotAccepted({
      // @ts-ignore
      quote: quotes[0],
    });
    updateQuotesStep([
      {
        id: input.quote_id,
        valid_till: input.valid_till,
      },
    ]);
  }
);
