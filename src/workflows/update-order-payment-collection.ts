import {
  createWorkflow,
  transform,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { createPaymentCollectionsStep } from "@medusajs/medusa/core-flows";
export type CreateOrderPaymentCollectionWorkflowInput = {
  order_id: string;
  amount: number;
  currency_code: string;
};

export const createOrderPaymentCollectionWorkflowCustom = createWorkflow(
  "update-payment-collection-order",
  (input: WorkflowData<CreateOrderPaymentCollectionWorkflowInput>) => {
    const paymentCollectionData = transform({ input }, ({ input }) => {
      return {
        currency_code: input.currency_code,
        amount: input.amount,
      };
    });

    const createdPaymentCollections = createPaymentCollectionsStep([
      paymentCollectionData,
    ]);

    return new WorkflowResponse(createdPaymentCollections);
  }
);
