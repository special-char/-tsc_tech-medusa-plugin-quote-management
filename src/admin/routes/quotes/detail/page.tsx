import { CheckCircleSolid, TriangleDownMini } from "@medusajs/icons";
import {
  Button,
  clx,
  Container,
  Heading,
  Text,
  toast,
  Toaster,
  usePrompt,
} from "@medusajs/ui";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useOrderPreview } from "../../../hooks/order-preview";
import { useQuote, useRejectQuote, useSendQuote } from "../../../hooks/quotes";
import { QuoteItems } from "../../../components/quote-items";
import { formatAmount } from "../../../utils/format-amount";
import ShippingInfoPopover from "../../../components/shipping-info-popover";
import { AdminOrder, AdminRegion } from "@medusajs/framework/types";

const QuoteDetails = () => {
  const { state } = useLocation();
  const { id } = state;
  const navigate = useNavigate();
  const { quote, isLoading } = useQuote(id!, {
    fields: "*draft_order.customer",
  });

  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    quote?.draft_order_id!,
    {},
    { enabled: !!quote?.draft_order_id }
  );

  const prompt = usePrompt();
  const { mutateAsync: rejectQuote, isPending: isRejectingQuote } =
    useRejectQuote(id!);
  const [showRejectQuote, setShowRejectQuote] = useState(false);

  const { mutateAsync: sendQuote, isPending: isSendingQuote } = useSendQuote(
    id!
  );
  const [showSendQuote, setShowSendQuote] = useState(false);

  const [showManageQuote, setShowManageQuote] = useState(false);

  useEffect(() => {
    if (["pending"].includes(quote?.status!)) {
      setShowSendQuote(true);
    } else {
      setShowSendQuote(false);
    }

    if (!["pending"].includes(quote?.status!)) {
      setShowRejectQuote(false);
    } else {
      setShowRejectQuote(true);
    }

    if (!["pending"].includes(quote?.status!)) {
      setShowManageQuote(false);
    } else {
      setShowManageQuote(true);
    }
  }, [quote]);

  const handleRejectQuote = async () => {
    const res = await prompt({
      title: "Reject quote?",
      description:
        "You are about to reject this customer's quote. Do you want to continue?",
      confirmText: "Continue",
      cancelText: "Cancel",
      variant: "confirmation",
    });

    if (res) {
      await rejectQuote(void 0, {
        onSuccess: () =>
          toast.success("Successfully rejected customer's quote"),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  const handleSendQuote = async () => {
    const res = await prompt({
      title: "Send quote?",
      description:
        "You are about to send this quote to the customer. Do you want to continue?",
      confirmText: "Continue",
      cancelText: "Cancel",
      variant: "confirmation",
    });

    if (res) {
      await sendQuote(void 0, {
        onSuccess: () => toast.success("Successfully sent quote to customer"),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  if (isLoading || !quote) {
    return <></>;
  }

  if (isPreviewLoading) {
    return <></>;
  }

  if (!isPreviewLoading && !preview) {
    throw "preview not found";
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-x-4 lg:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-y-3">
          {quote.status === "accepted" &&
            quote?.draft_order?.payment_status === "captured" && (
              <Container className="divide-y divide-dashed p-0">
                <div className="flex items-center justify-between px-6 py-4">
                  <Text className="txt-compact-small">
                    <CheckCircleSolid className="inline-block mr-2 text-green-500 text-lg" />
                    Quote accepted by customer. Order is ready for processing.
                  </Text>

                  <Button
                    size="small"
                    onClick={() => navigate(`/orders/${quote.draft_order_id}`)}
                  >
                    View Order
                  </Button>
                </div>
              </Container>
            )}

          <Container className="divide-y divide-dashed p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Quote Summary</Heading>
              <span className="text-ui-fg-muted txt-compact-small">
                {quote.status}
              </span>
            </div>
            <QuoteItems order={quote.draft_order} preview={preview!} />
            {/* <TotalsBreakdown order={quote.draft_order} /> */}
            <CostBreakdown order={quote.draft_order} preview={preview!} />

            <div className=" flex flex-col gap-y-2 px-6 py-4">
              <div className="text-ui-fg-base flex items-center justify-between">
                <Text
                  weight="plus"
                  className="text-ui-fg-subtle"
                  size="small"
                  leading="compact"
                >
                  Original Total
                </Text>
                <Text
                  weight="plus"
                  className="text-ui-fg-subtle"
                  size="small"
                  leading="compact"
                >
                  {formatAmount(
                    quote.draft_order.total,
                    quote.draft_order.currency_code
                  )}
                </Text>
              </div>

              <div className="text-ui-fg-base flex items-center justify-between">
                <Text
                  className="text-ui-fg-subtle text-semibold"
                  size="small"
                  leading="compact"
                  weight="plus"
                >
                  Quote Total
                </Text>
                <Text
                  className="text-ui-fg-subtle text-bold"
                  size="small"
                  leading="compact"
                  weight="plus"
                >
                  {formatAmount(
                    (preview!.summary as any)?.current_order_total,
                    quote.draft_order.currency_code
                  )}
                </Text>
              </div>
            </div>

            <div className="bg-ui-bg-subtle flex items-center justify-end gap-x-2 rounded-b-xl px-4 py-4">
              {showRejectQuote && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => handleRejectQuote()}
                  disabled={isRejectingQuote}
                >
                  Reject Quote
                </Button>
              )}

              {showSendQuote && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => handleSendQuote()}
                  disabled={isSendingQuote || isRejectingQuote}
                >
                  Send Quote
                </Button>
              )}

              {showManageQuote && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    navigate(`/quotes/manage`, {
                      state: {
                        id: quote.id,
                      },
                    })
                  }
                >
                  Manage Quote
                </Button>
              )}
            </div>
          </Container>
        </div>

        <div className="mt-2 flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[400px]">
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Customer</Heading>
            </div>

            <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
              <Text size="small" weight="plus" leading="compact">
                Email
              </Text>

              <Link
                className="text-sm text-pretty text-blue-500"
                to={`/customers/${quote.draft_order?.customer?.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {quote.draft_order?.customer?.email}
              </Link>
            </div>
          </Container>
        </div>
      </div>

      <Toaster />
    </div>
  );
};
const Cost = ({
  label,
  value,
  secondaryValue,
  tooltip,
}: {
  label: ReactNode;
  value: string | number;
  secondaryValue?: string;
  tooltip?: ReactNode;
}) => (
  <div className="grid grid-cols-3 items-center">
    <Text size="small" leading="compact">
      {label} {tooltip}
    </Text>
    <div className="text-right">
      <Text size="small" leading="compact">
        {secondaryValue}
      </Text>
    </div>
    <div className="text-right">
      <Text size="small" leading="compact">
        {value}
      </Text>
    </div>
  </div>
);

const CostBreakdown = ({
  order,
  preview,
}: {
  order: AdminOrder & { region?: AdminRegion | null };
  preview: AdminOrder & { region?: AdminRegion | null };
}) => {
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);

  const discountCodes = useMemo(() => {
    const codes = new Set();
    order.items.forEach((item: any) =>
      item.adjustments?.forEach((adj: any) => {
        codes.add(adj.code);
      })
    );

    return Array.from(codes).sort();
  }, [order]);

  const taxCodes = useMemo(() => {
    const taxCodeMap = {};

    return taxCodeMap;
  }, [order]);

  const automaticTaxesOn = !!order.region?.automatic_taxes;
  const hasTaxLines = !!Object.keys(taxCodes).length;

  const discountTotal = order.discount_total;

  return (
    <div className="text-ui-fg-subtle flex flex-col gap-y-2 px-6 py-4">
      <Cost
        label={automaticTaxesOn ? "Item Total" : "Item Subtotal"}
        value={formatAmount(preview.item_subtotal, order.currency_code)}
      />

      {isShippingOpen && (
        <div className="flex flex-col gap-1 pl-5">
          {(order.shipping_methods || [])
            .sort((m1: any, m2: any) =>
              (m1.created_at as string).localeCompare(m2.created_at as string)
            )
            .map((sm: any, i: any) => {
              return (
                <div
                  key={sm.id}
                  className="flex items-center justify-between gap-x-2"
                >
                  <div>
                    <span className="txt-small text-ui-fg-subtle font-medium">
                      {sm.name}
                      {sm.detail.return_id &&
                        ` (${"fields.returnShipping"})`}{" "}
                      <ShippingInfoPopover key={i} shippingMethod={sm} />
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <div className="bottom-[calc(50% - 2px)] absolute h-[1px] w-full border-b border-dashed" />
                  </div>
                  <span className="txt-small text-ui-fg-muted">
                    {formatAmount(
                      automaticTaxesOn ? sm.total : sm.subtotal,
                      order.currency_code
                    )}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <Cost
        label={automaticTaxesOn ? "Discount Total" : "Discount Subtotal"}
        secondaryValue={discountCodes.join(", ")}
        value={
          discountTotal > 0
            ? `- ${formatAmount(discountTotal, order.currency_code)}`
            : "-"
        }
      />

      <>
        <div className="flex justify-between">
          <div
            onClick={() => hasTaxLines && setIsTaxOpen((o) => !o)}
            className={clx("flex items-center gap-1", {
              "cursor-pointer": hasTaxLines,
            })}
          >
            <span className="txt-small select-none">
              {automaticTaxesOn ? "Tax Total Incl" : "Tax Total"}
            </span>
            {hasTaxLines && (
              <TriangleDownMini
                style={{
                  transform: `rotate(${isTaxOpen ? 0 : -90}deg)`,
                }}
              />
            )}
          </div>

          <div className="text-right">
            <Text size="small" leading="compact">
              {formatAmount(order.tax_total, order.currency_code)}
            </Text>
          </div>
        </div>
        {isTaxOpen && (
          <div className="flex flex-col gap-1 pl-5">
            {Object.entries(taxCodes).map(([code, total]) => {
              return (
                <div
                  key={code}
                  className="flex items-center justify-between gap-x-2"
                >
                  <div>
                    <span className="txt-small text-ui-fg-subtle font-medium">
                      {code}
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <div className="bottom-[calc(50% - 2px)] absolute h-[1px] w-full border-b border-dashed" />
                  </div>
                  <span className="txt-small text-ui-fg-muted">
                    {formatAmount(Number(total), order.currency_code)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </>
    </div>
  );
};

export default QuoteDetails;
