import { AdminOrder } from "@medusajs/framework/types";
import { Button, DatePicker, Heading, Label, toast } from "@medusajs/ui";
import {
  useConfirmQuote,
  useUpdateQuote,
  useUpdateQuoteItem,
} from "../hooks/quotes";
import { formatAmount } from "../utils/format-amount";
import { useOrderPreview } from "../hooks/order-preview";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ManageItem } from "./manage-item";
import { AdminQuote } from "../types";
import { Controller, FormProvider, useForm } from "react-hook-form";
import ErrorMessage from "./ErrorMessage";
type ReturnCreateFormProps = {
  order: AdminOrder;
  quote: AdminQuote;
};
type FormValues = {
  valid_till: string;
  items: {
    [key: string]: {
      quantity: number;
      unit_price: number;
    };
  };
};
export const ManageQuoteForm = ({ order, quote }: ReturnCreateFormProps) => {
  const { order: preview } = useOrderPreview(order.id);
  const navigate = useNavigate();

  const { mutateAsync: confirmQuote, isPending: isRequesting } =
    useConfirmQuote(order.id);

  const { mutateAsync: updateQuote, isPending: isPending } = useUpdateQuote(
    quote.id as string
  );

  const { mutateAsync: updateItem } = useUpdateQuoteItem(order.id);

  const form = useForm<FormValues>({
    defaultValues: {
      valid_till: new Date(quote.valid_till).toISOString(),
      items: {},
    },
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Update each item
      for (const [itemId, itemData] of Object.entries(data.items)) {
        if (itemData.quantity || itemData.unit_price) {
          await updateItem({
            itemId,
            quantity: Number(itemData.quantity),
            unit_price: Number(itemData.unit_price),
          });
        }
      }
      // Update quote validity
      await updateQuote({
        valid_till: data.valid_till,
      });

      // await confirmQuote()
      navigate(`/quotes/detail`, {
        state: { id: quote.id },
      });
      toast.success("Successfully updated quote");
    } catch (e) {
      toast.error("Error", {
        description: (e as any).message,
      });
    }
  });
  const originalItemsMap = useMemo(() => {
    return new Map(order.items.map((item) => [item.id, item]));
  }, [order]);

  if (!preview) {
    return <></>;
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="flex h-full flex-col p-4 gap-2">
        <div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex flex-col gap-y-1">
              <Label>Valid Till</Label>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex-grow">
                <Controller
                  control={form.control}
                  name="valid_till"
                  rules={{ required: "valid till is required" }}
                  render={({ field }) => {
                    const { onChange, value, ...restField } = field;

                    return (
                      <div>
                        <DatePicker
                          granularity="minute"
                          shouldCloseOnSelect={false}
                          {...restField}
                          value={value ? new Date(value) : null}
                          onChange={(date) =>
                            onChange(date?.toISOString() || "")
                          }
                        />
                        <ErrorMessage
                          control={form.control as any}
                          name={field.name}
                          rules={{ required: "valid till is required" }}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mb-3 mt-8 flex items-center justify-between">
            <Heading level="h2">Items</Heading>
          </div>

          {preview.items.map((item) => (
            <ManageItem
              key={item.id}
              originalItem={originalItemsMap.get(item.id)!}
              item={item}
              orderId={order.id}
              currencyCode={order.currency_code}
            />
          ))}
        </div>

        <div className="mt-8 border-y border-dotted py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="txt-small text-ui-fg-subtle">Current Total</span>

            <span className="txt-small text-ui-fg-subtle">
              {formatAmount(order.total, order.currency_code)}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="txt-small text-ui-fg-subtle">New Total</span>

            <span className="txt-small text-ui-fg-subtle">
              {formatAmount(preview.total, order.currency_code)}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-x-4">
          <div className="flex items-center justify-end gap-x-2">
            <Button
              key="submit-button"
              type="submit"
              variant="primary"
              size="small"
              disabled={isRequesting}
            >
              Confirm Edit
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
