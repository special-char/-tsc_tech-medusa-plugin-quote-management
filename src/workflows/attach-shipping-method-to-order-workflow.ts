import {
  BigNumberInput,
  OrderChangeDTO,
  OrderDTO,
  ShippingOptionDTO,
} from "@medusajs/framework/types";
import {
  ChangeActionType,
  isDefined,
  Modules,
} from "@medusajs/framework/utils";
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  addShippingMethodToCartWorkflow,
  createOrderChangeActionsWorkflow,
  previewOrderChangeStep,
  updateOrderTaxLinesWorkflow,
} from "@medusajs/medusa/core-flows";
import { createDraftOrderShippingMethods } from "./steps/update-draft-order-shipping-methods-step";
export type CreateOrderEditShippingMethodValidationStepInput = {
  /**
   * The order's details.
   */
  order: OrderDTO;
  /**
   * The order change's details.
   */
  orderChange: OrderChangeDTO;
};

export type AttachShippingMethodWorkflowInput = {
  order_id: string;
  shipping_option_id: string;
  orderChange: OrderChangeDTO;
  shippingOptions: ShippingOptionDTO;
  order: OrderDTO;
  custom_amount?: BigNumberInput | null;
  cart_id: string;
  payment_collections: string[];
  existingShippingMethodIds: string[];
};
// export const deleteOrderShippingMethodsCustom = createStep(
//     "delete-order-shipping-methods-custom",
//     async (input: DeleteOrderShippingMethodsStepInput, { container }) => {
//         const service = container.resolve<IOrderModuleService>(Modules.ORDER)

//         const deleted = await service.deleteOrderShippingMethods(input.ids)

//         return new StepResponse(deleted, input.ids)
//     },
//     async (ids, { container }) => {
//         if (!ids) {
//             return
//         }

//         const service = container.resolve<IOrderModuleService>(Modules.ORDER)

//         await service.restoreOrderShippingMethods(ids)
//     }
// )

export const attachShippingMethodWorkflow = createWorkflow(
  "attach-shipping-method-to-order",
  function (input: AttachShippingMethodWorkflowInput) {
    const { order, shippingOptions, orderChange } = input;

    const shippingMethodInput = transform(
      {
        shippingOptions,
        customPrice: input?.custom_amount,
        orderChange,
        input,
      },
      prepareShippingMethod()
    );

    const createdMethods = createDraftOrderShippingMethods({
      shipping_methods: [shippingMethodInput],
    });

    const shippingMethodIds = transform(createdMethods, (createdMethods) => {
      return createdMethods.map((item) => item?.id);
    });

    updateOrderTaxLinesWorkflow.runAsStep({
      input: {
        order_id: order?.id,
        shipping_method_ids: shippingMethodIds,
      },
    });

    const orderChangeActionInput = transform(
      {
        order,
        shippingOptions,
        createdMethods,
        customPrice: input.custom_amount,
        orderChange,
        input,
      },
      ({
        shippingOptions,
        order,
        createdMethods,
        customPrice,
        orderChange,
        input,
      }) => {
        const createdMethod = createdMethods[0];
        const methodPrice =
          customPrice ??
          (shippingOptions as any)?.calculated_price?.calculated_amount;

        return {
          action: ChangeActionType.SHIPPING_ADD,
          reference: "order_shipping_method",
          order_change_id: orderChange?.id,
          reference_id: createdMethod?.id,
          amount: methodPrice,
          order_id: order?.id,
        };
      }
    );

    createOrderChangeActionsWorkflow.runAsStep({
      input: [orderChangeActionInput],
    });

    // Get the action ID from the created action
    const actionId = orderChangeActionInput.reference_id;
    const orderUpdated = previewOrderChangeStep(order?.id);

    addShippingMethodToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        options: [
          {
            id: input.shipping_option_id || "",
          },
        ],
      },
    });

    return new WorkflowResponse(orderUpdated);
  }
);

export function prepareShippingMethod(relatedEntityField?: string) {
  return function (data) {
    const option = data.shippingOptions;
    const orderChange = data.orderChange;

    const isCustomPrice = isDefined(data.customPrice);
    const obj = {
      shipping_option_id: option?.id,
      amount: isCustomPrice
        ? data.customPrice
        : option?.calculated_price?.calculated_amount,
      is_custom_amount: isCustomPrice,
      is_tax_inclusive:
        !!option?.calculated_price?.is_calculated_price_tax_inclusive,
      data: option?.data ?? {},
      name: option?.name,
      version: orderChange?.version,
      order_id: data?.input?.order_id,
    } as any;

    if (relatedEntityField) {
      obj.return_id = data?.input?.return_id;
      obj[relatedEntityField] = data?.relatedEntity?.id;

      if (relatedEntityField === "return_id") {
        obj.claim_id = data?.relatedEntity?.claim_id;
        obj.exchange_id = data?.relatedEntity?.exchange_id;
      }
    }

    return obj;
  };
}
