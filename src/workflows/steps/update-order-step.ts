import {
  FilterableOrderProps,
  IOrderModuleService,
  UpdateOrderDTO,
} from "@medusajs/framework/types";
import {
  Modules,
  getSelectsAndRelationsFromObjectArray,
} from "@medusajs/framework/utils";
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk";

/**
 * The details of updating the orders.
 */
export type UpdateOrdersStepInput = {
  /**
   * The filters to select the orders to update.
   */
  selector: FilterableOrderProps;
  /**
   * The data to update in the orders.
   */
  update: UpdateOrderDTO; // TODO: Update to UpdateOrderDTO[]
};

export const updateDraftOrdersStepId = "update-draft-orders";
/**
 * This step updates orders matching the specified filters.
 *
 * @example
 * const data = updateOrdersStep({
 *   selector: {
 *     id: "order_123"
 *   },
 *   update: {
 *     region_id: "region_123"
 *   }
 * })
 */
export const updateDraftOrdersStep = createStep(
  updateDraftOrdersStepId,
  async (data: UpdateOrdersStepInput, { container }) => {
    const service = container.resolve<IOrderModuleService>(Modules.ORDER);

    const { selects, relations } = getSelectsAndRelationsFromObjectArray([
      data.update,
    ]);
    console.log({ selects, relations, update: data.update });
    const prevData = await service.listOrders(data.selector, {
      select: selects,
      relations,
    });

    const orders = await service.updateOrders(data.selector, data.update);
    console.log({ orders });

    return new StepResponse(orders, prevData);
  },
  async (prevData, { container }) => {
    if (!prevData?.length) {
      return;
    }

    const service = container.resolve<IOrderModuleService>(Modules.ORDER);

    await service.updateOrders(prevData as UpdateOrderDTO[]);
  }
);
