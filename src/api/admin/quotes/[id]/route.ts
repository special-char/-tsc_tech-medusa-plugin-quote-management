import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { OrderDetailDTO } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  isDefined,
  MathBN,
} from "@medusajs/framework/utils";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quotes",
      filters: { id },
      fields: req.queryConfig.fields,
    },
    { throwIfKeyNotFound: true }
  );
  let quoteData = { ...quote };

  if (quoteData.draft_order) {
    (quoteData.draft_order as any).payment_status = getLastPaymentStatus(
      quoteData.draft_order
    ) as OrderDetailDTO["payment_status"];
  }
  res.json({ quote:quoteData });
};
export const getLastPaymentStatus = (order: any) => {
  const PaymentStatus = {
    NOT_PAID: "not_paid",
    AWAITING: "awaiting",
    CAPTURED: "captured",
    PARTIALLY_CAPTURED: "partially_captured",
    PARTIALLY_REFUNDED: "partially_refunded",
    REFUNDED: "refunded",
    CANCELED: "canceled",
    REQUIRES_ACTION: "requires_action",
    AUTHORIZED: "authorized",
    PARTIALLY_AUTHORIZED: "partially_authorized",
  };

  let paymentStatus = {};
  for (const status in PaymentStatus) {
    paymentStatus[PaymentStatus[status]] = 0;
  }

  for (const paymentCollection of order.payment_collections) {
    if (
      MathBN.gt(paymentCollection.captured_amount ?? 0, 0) ||
      (isDefined(paymentCollection.amount) &&
        MathBN.eq(paymentCollection.amount, 0))
    ) {
      paymentStatus[PaymentStatus.CAPTURED] += MathBN.eq(
        paymentCollection.captured_amount as number,
        paymentCollection.amount
      )
        ? 1
        : 0.5;
    }

    if (MathBN.gt(paymentCollection.refunded_amount ?? 0, 0)) {
      paymentStatus[PaymentStatus.REFUNDED] += MathBN.eq(
        paymentCollection.refunded_amount as number,
        paymentCollection.amount
      )
        ? 1
        : 0.5;
    }

    paymentStatus[paymentCollection.status] += 1;
  }

  const totalPayments = order.payment_collections.length;
  const totalPaymentExceptCanceled =
    totalPayments - paymentStatus[PaymentStatus.CANCELED];

  if (paymentStatus[PaymentStatus.REQUIRES_ACTION] > 0) {
    return PaymentStatus.REQUIRES_ACTION;
  }

  if (paymentStatus[PaymentStatus.REFUNDED] > 0) {
    if (
      paymentStatus[PaymentStatus.REFUNDED] ===
      paymentStatus[PaymentStatus.CAPTURED]
    ) {
      return PaymentStatus.REFUNDED;
    }

    return PaymentStatus.PARTIALLY_REFUNDED;
  }

  if (paymentStatus[PaymentStatus.CAPTURED] > 0) {
    if (paymentStatus[PaymentStatus.CAPTURED] === totalPaymentExceptCanceled) {
      return PaymentStatus.CAPTURED;
    }

    return PaymentStatus.PARTIALLY_CAPTURED;
  }

  if (paymentStatus[PaymentStatus.AUTHORIZED] > 0) {
    if (
      paymentStatus[PaymentStatus.AUTHORIZED] === totalPaymentExceptCanceled
    ) {
      return PaymentStatus.AUTHORIZED;
    }

    return PaymentStatus.PARTIALLY_AUTHORIZED;
  }

  if (
    paymentStatus[PaymentStatus.CANCELED] > 0 &&
    paymentStatus[PaymentStatus.CANCELED] === totalPayments
  ) {
    return PaymentStatus.CANCELED;
  }

  if (paymentStatus[PaymentStatus.AWAITING] > 0) {
    return PaymentStatus.AWAITING;
  }

  return PaymentStatus.NOT_PAID;
};
