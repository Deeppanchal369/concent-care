import { useEffect } from "react";

/**
 * Sets the browser document title contextually for ConsentCare.
 * Defaults to "ConsentCare" if no sub-title is provided.
 */
export function usePageTitle(subTitle?: string) {
  useEffect(() => {
    const baseTitle = "ConsentCare";
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

