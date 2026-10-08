/**
 * Browser storage keys for quote requests made on this device.
 *
 * Kept in their own module so sign-out can clear them without importing the
 * whole request provider.
 */
export const DRAFT_KEY = 'utu-quote-draft';
export const SENT_KEY = 'utu-quote-requests';
/** Private access tokens of guest requests, keyed by request group id. */
export const ACCESS_KEY = 'utu-request-access';
export const QUOTE_STEP_KEY = 'utu-quote-step';

/**
 * Forget every quote request this browser knows about.
 *
 * Called on sign-out. Without it, guest request tokens stay on a shared device
 * and the next client who signs in there would automatically claim (take
 * ownership of) the previous person's requests, including their name and phone.
 */
export function clearDeviceRequestData(): void {
  try {
    for (const key of [DRAFT_KEY, SENT_KEY, ACCESS_KEY, QUOTE_STEP_KEY]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing was persisted, so nothing to clear.
  }
}
