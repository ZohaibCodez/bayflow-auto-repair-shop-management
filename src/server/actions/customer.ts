"use server";

import { signIn } from "@/lib/auth";
import { getCurrentUser } from "@/lib/rbac";
import { createBooking, type CreateBookingInput } from "@/server/services/bookings";
import { run, type ActionResult } from "./result";

type WizardInput = Omit<CreateBookingInput, "customer"> & {
  customer?: { name: string; email: string; password: string; phone?: string };
};

/**
 * Booking wizard submit. Signed-in customers book as themselves (the client can't choose
 * whose account to book on). Otherwise the account is created — or reused when the email
 * exists and the password matches — and the customer is signed in straight away.
 */
export async function createBookingAction(
  input: WizardInput,
): Promise<ActionResult<{ bookingId: string; code: string }>> {
  return run(async () => {
    const user = await getCurrentUser();
    const booking = await createBooking({
      ...input,
      customer: user
        ? { kind: "session", userId: user.id }
        : { kind: "details", ...(input.customer ?? { name: "", email: "", password: "" }) },
    });
    if (!user && input.customer) {
      await signIn("credentials", {
        email: input.customer.email.toLowerCase(),
        password: input.customer.password,
        redirect: false,
      });
    }
    return { bookingId: booking.id, code: booking.code };
  }, "Booking confirmed!");
}
