import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useCreateQuote, useUpdateQuoteItemId } from "../../../hooks/quotes";
import { toast } from "@medusajs/ui";
import QuoteCreateForm from "../../../components/quote-create";
import { useState } from "react";

export const QuoteCreate = () => {
  const [isOpen, setIsOpen] = useState(true);
  const form = useForm({
    defaultValues: {
      region_id: "",
      customer_id: "",
      quantity: "",
      variant_id: "",
      unit_price: "",
      valid_till: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });
  const navigate = useNavigate();
  const { mutate } = useCreateQuote();
  const { mutateAsync: updateItem } = useUpdateQuoteItemId();
  const onSubmit = async (data: any) => {
    const reqData = {
      region_id: data.region_id,
      customer_id: data.customer_id,
      quantity: Number(data.quantity),
      variant_id: data.variant_id,
      valid_till: new Date(data.valid_till),
    };

    try {
      mutate(reqData, {
        onSuccess: async (response: any) => {
          try {
            await updateItem({
              unit_price: Number(data.unit_price),
              itemId: response.quotes[0].draft_order.items[0].id,
              id: response.quotes[0].draft_order.id,
              quantity: Number(data.quantity),
            });
          } catch (e) {
            toast.error((e as any).message);
          }
          console.log("Quote created successfully:", response);
          toast.success("Quote created successfully");
          navigate("/quotes");
        },
        onError: (error: any) => {
          console.error("Error creating quote:", error);
          toast.error("Error creating quote");
        },
      });
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  return (
    <>
      <QuoteCreateForm
        form={form}
        onSubmit={onSubmit}
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            navigate("/quotes");
          }
        }}
      />
    </>
  );
};

export default QuoteCreate;
