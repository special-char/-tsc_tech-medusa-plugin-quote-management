import { getQuoteStatus, QuoteStatus } from "../utils/quote-status-helper";
import { StatusCell } from "./status-cell";

type QuoteStatusCellProps = {
  status: QuoteStatus;
};

export const QuoteStatusCell = ({ status }: QuoteStatusCellProps) => {
  const { label, color } = getQuoteStatus(status);

  return <StatusCell color={color}>{label}</StatusCell>;
};

export const QuoteStatusHeader = () => {
  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">Quote Status</span>
    </div>
  );
};
