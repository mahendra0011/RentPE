import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title || "RoomsFind - Find Your Perfect Rental";
    return () => { document.title = prev; };
  }, [title]);
}
