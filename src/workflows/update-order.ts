import { OrderDTO, OrderWorkflow } from "@medusajs/framework/types";
import { MedusaError, validateEmail } from "@medusajs/framework/utils";
import {
  WorkflowData,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  OrderPreviewDTO,
  RegisterOrderChangeDTO,
  UpdateOrderAddressDTO,
  UpdateOrderDTO,
} from "@medusajs/types";
import {
  previewOrderChangeStep,
  registerOrderChangesStep,
} from "@medusajs/medusa/core-flows";
import { updateDraftOrdersStep } from "./steps/update-order-step";

export type UpdateOrderValidationStepInput = {
  order: OrderDTO;
  input: OrderWorkflow.UpdateOrderWorkflowInput;
};

export const updateOrderValidationStep = createStep(
  "update-order-validation",
  async function ({ order, input }: UpdateOrderValidationStepInput) {
    if (
      input.shipping_address?.country_code &&
      order.shipping_address?.country_code !==
        input.shipping_address?.country_code
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Country code cannot be changed"
      );
    }

    if (
      input.billing_address?.country_code &&
      order.billing_address?.country_code !==
        input.billing_address?.country_code
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Country code cannot be changed"
      );
    }

    if (input.email) {
      validateEmail(input.email);
    }
  }
);

export const updateDraftOrderWorkflowId = "update-draft-order-workflow";

export const updateDraftOrderWorkflow = createWorkflow(
  updateDraftOrderWorkflowId,
  function (
    input: WorkflowData<
      OrderWorkflow.UpdateOrderWorkflowInput & { orderQuery: any }
    >
  ): WorkflowResponse<OrderPreviewDTO> {
    const { orderQuery, ...restInput } = input;
    const order = transform(
      { orderQuery },
      ({ orderQuery }) => orderQuery?.data?.[0]
    );
    const updateInput = transform({ input, order }, ({ input, order }) => {
      const update: UpdateOrderDTO = {};

      if (input.shipping_address) {
        const address = {
          ...order.shipping_address,
          ...input.shipping_address,
        };
        delete address.id;
        update.shipping_address = address as UpdateOrderAddressDTO;
      }

      if (input.billing_address) {
        const address = {
          ...order.billing_address,
          ...input.billing_address,
        };
        delete address.id;
        update.billing_address = address as UpdateOrderAddressDTO;
      }
      if (input.metadata?.gstNumber) {
        update.metadata = input.metadata;
      }
      return { ...restInput, ...update };
    });

    const updatedOrders = updateDraftOrdersStep({
      selector: { id: input.id },
      update: updateInput,
    });

    const orderChangeInput = transform(
      { input, updatedOrders, order },
      ({ input, updatedOrders, order }) => {
        const updatedOrder = updatedOrders[0];

        const changes: RegisterOrderChangeDTO[] = [];
        if (input.shipping_address) {
          changes.push({
            change_type: "update_order" as const,
            order_id: input.id,
            // created_by: input.user_id,
            // confirmed_by: input.user_id,
            details: {
              type: "shipping_address",
              old: order.shipping_address,
              new: updatedOrder.shipping_address,
            },
          });
        }

        if (input.billing_address) {
          changes.push({
            change_type: "update_order" as const,
            order_id: input.id,
            // created_by: input.user_id,
            // confirmed_by: input.user_id,
            details: {
              type: "billing_address",
              old: order.billing_address,
              new: updatedOrder.billing_address,
            },
          });
        }

        if (input.email) {
          changes.push({
            change_type: "update_order" as const,
            order_id: input.id,
            // created_by: input.user_id,
            // confirmed_by: input.user_id,
            details: {
              type: "email",
              old: order.email,
              new: input.email,
            },
          });
        }

        return changes;
      }
    );

    registerOrderChangesStep(orderChangeInput);

    return new WorkflowResponse(previewOrderChangeStep(input.id));
  }
);
