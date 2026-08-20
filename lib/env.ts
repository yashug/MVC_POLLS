/**
 * Preview builds carry a loud banner and a data-reset button. Both are gated on
 * this one flag, so a preview can never be mistaken for the real registration —
 * a committee member testing the idol draw must not think they've entered it.
 */
export const APP_ENV = process.env.APP_ENV ?? "development";

export const isPreview = APP_ENV === "preview";
export const isProduction = APP_ENV === "production";
/** Local dev behaves like preview: banner on, reset available. */
export const showsPreviewBanner = !isProduction;
