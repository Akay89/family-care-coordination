# Stable automated-test selectors

## Scope
- Add the requested `data-testid` attributes to authentication, navigation, circle onboarding, calendar, tasks, documents, members, and invite states.
- Put repeated-row selectors on each rendered row/action so tests can locate lists reliably without changing appearance or behaviour.
- Add a selected-circle boundary around circle pages with `data-testid="circle-root"` and `data-circle-id` set to the active circle ID.
- Detect a previously selected circle the signed-in user can no longer access. Render only a clear `not-authorised` message for that state, with no circle content behind it.

## Implementation details
- Keep the existing components, styling, labels, actions, and navigation unchanged; only add test attributes plus the access-state guard.
- Expose enough selected-circle state from the circle provider to distinguish “no circles yet” from “stored circle is no longer accessible.”
- Add an inline login error state for `login-error` while preserving the existing toast.
- Validate the build and use an authenticated browser check where available to confirm selectors and the circle wrapper in the rendered page.
