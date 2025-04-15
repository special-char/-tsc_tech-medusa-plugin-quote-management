import {
  BigNumberInput,
  OrderChangeDTO,
  OrderDTO,
  OrderPreviewDTO,
  ShippingOptionDTO,
} from "@medusajs/framework/types";
import {
  ChangeActionType,
  isDefined,
  OrderChangeStatus,
} from "@medusajs/framework/utils";
import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  createOrderChangeActionsWorkflow,
  previewOrderChangeStep,
  updateOrderTaxLinesWorkflow,
} from "@medusajs/medusa/core-flows";
import { createDraftOrderShippingMethods } from "./steps/update-draft-order-shipping-methods-step";

/**
 * The data to validate that a shipping method can be created for an order edit.
 */
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

/**
 * This step validates that a shipping method can be created for an order edit.
 * If the order is canceled or the order change is not active, the step will throw an error.
 *
 * :::note
 *
 * You can retrieve an order and order change details using [Query](https://docs.medusajs.com/learn/fundamentals/module-links/query),
 * or [useQueryGraphStep](https://docs.medusajs.com/resources/references/medusa-workflows/steps/useQueryGraphStep).
 *
 * :::
 *
 * @example
 * const data = createOrderEditShippingMethodValidationStep({
 *   order: {
 *     id: "order_123",
 *     // other order details...
 *   },
 *   orderChange: {
 *     id: "orch_123",
 *     // other order change details...
 *   }
 * })
 */

/**
 * The data to create a shipping method for an order edit.
 */
export type CreateOrderEditShippingMethodWorkflowInput = {
  order_id: string;
  shipping_option_id: string;
  orderChange: OrderChangeDTO;
  shippingOptions: ShippingOptionDTO;
  order: OrderDTO;
  custom_amount?: BigNumberInput | null;
};

export const createDraftOrderEditShippingMethodWorkflowId =
  "create-draft-order-edit-shipping-method";
/**
 * This workflow creates a shipping method for an order edit. It's used by the
 * [Add Shipping Method API Route](https://docs.medusajs.com/api/admin#order-edits_postordereditsidshippingmethod).
 *
 * You can use this workflow within your customizations or your own custom workflows, allowing you to create a shipping method
 * for an order edit in your in your own custom flows.
 *
 * @example
 * const { result } = await createOrderEditShippingMethodWorkflow(container)
 * .run({
 *   input: {
 *     order_id: "order_123",
 *     shipping_option_id: "so_123",
 *   }
 * })
 *
 * @summary
 *
 * Create a shipping method for an order edit.
 */
export const createDraftOrderEditShippingMethodWorkflow = createWorkflow(
  createDraftOrderEditShippingMethodWorkflowId,
  function (
    input: CreateOrderEditShippingMethodWorkflowInput
  ): WorkflowResponse<OrderPreviewDTO> {
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

    return new WorkflowResponse(previewOrderChangeStep(order?.id));
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
