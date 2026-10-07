import { useEffect } from "react";

/**
 * Sets the browser document title contextually for ArogyaMitra.
 * Defaults to "ArogyaMitra EHR" if no sub-title is provided.
 */
export function usePageTitle(subTitle?: string) {
  useEffect(() => {
    const baseTitle = "ArogyaMitra EHR";
    if (!subTitle || subTitle.trim() === "") {
      document.title = baseTitle;
    } else {
      document.title = `${baseTitle} | ${subTitle.trim()}`;
    }

    return () => {
      document.title = baseTitle;
    };
  }, [subTitle]);
}
