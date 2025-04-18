import {
  CreateOrderShippingMethodDTO,
  IOrderModuleService,
} from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

/**
 * The details of creating order shipping methods.
 */
export interface CreateOrderShippingMethodsStepInput {
  /**
   * The shipping methods to create.
   */
  shipping_methods: CreateOrderShippingMethodDTO[];
}

/**
 * This step creates order shipping methods.
 */
export const createDraftOrderShippingMethods = createStep(
  "create-draft-order-shipping-methods",
  async (input: CreateOrderShippingMethodsStepInput, { container }) => {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER);

    const created = await service.createOrderShippingMethods(
      input.shipping_methods
    );

    return new StepResponse(
      created,
      created.map((c) => c.id)
    );
  },
  async (createdMethodIds, { container }) => {
    if (!createdMethodIds) {
      return;
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER);

    await service.deleteOrderShippingMethods(createdMethodIds);
  }
);
