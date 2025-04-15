import { MedusaError } from "@medusajs/framework/utils";
import { createStep } from "@medusajs/framework/workflows-sdk";
import { InferTypeOf } from "@medusajs/framework/types";
import { Quote } from "../../modules/quotes/models/quote";
import { QuoteStatus } from "../../modules/quotes";

type StepInput = {
  quote: InferTypeOf<typeof Quote>;
};

export const validateQuoteCanAcceptStep = createStep(
  "validate-quote-can-accept",
  async function ({ quote }: StepInput) {
    if (quote.status !== QuoteStatus.PENDING) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot accept quote when quote status is ${quote.status}`
      );
    }
  }
);
