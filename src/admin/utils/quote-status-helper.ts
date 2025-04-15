export enum QuoteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CAPTURED = "captured",
}

export const getQuoteStatus = (
  status: QuoteStatus
): {
  label: string
  color: "green" | "red" | "blue" | "orange" | "grey" | "purple"
} => {
  const [label, color] = {
    [QuoteStatus.PENDING]: ["Pending", "orange"],
    [QuoteStatus.ACCEPTED]: ["Accepted", "green"],
    [QuoteStatus.REJECTED]: ["Rejected", "red"],
    [QuoteStatus.EXPIRED]: ["Expired", "grey"],
    [QuoteStatus.CAPTURED]: ["Captured", "blue"],
  }[status] as [string, "green" | "red" | "blue" | "orange" | "grey" | "purple"]

  return { label, color }
}
