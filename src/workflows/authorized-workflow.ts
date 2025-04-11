import { createWorkflow } from "@medusajs/framework/workflows-sdk";
import { authorizePaymentSessionStep } from "@medusajs/medusa/core-flows";

export const authPaymentWorkflowCustom = createWorkflow(
	"auth-payment",
	function (input: { payment_session_id: string }) {
		authorizePaymentSessionStep({
			id: input.payment_session_id,
			context: {},
		});
	}
);
