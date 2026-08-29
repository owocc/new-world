/**
 * Astryx input components spread unknown props onto the native
 * <input>/<textarea>, but their public TS types don't advertise native HTML
 * attributes. This bridge keeps native attributes (autoComplete, maxLength,
 * list, inputMode, …) typed at the call site.
 */
export function nativeAttrs<T extends object>(attrs: T) {
  return attrs as unknown as object;
}
