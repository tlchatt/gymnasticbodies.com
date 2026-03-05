

import { useState, useEffect } from "react";


export const useMediaQuery = (query) => {
   /**
   * About Me: 
   * - React mediaquery component, utilize mediaqueries with inline styles, by Greggory Wiley, Technologic Digital Services
   * - Inspired by https://fireship.io/snippets/use-media-query-hook/
   *
   * Todo List:
   * -  
   * 
   * Usage Exmaples:
   * - import { useMediaQuery } from "@/lib/MediaQueries";
   * - const isLargeMobile = useMediaQuery('(min-width: 400px)');
   * - const isSmall = useMediaQuery('(min-width: 640px)');
   * - const isMedium = useMediaQuery('(min-width: 900px)');
   * - const isLarge = useMediaQuery('(min-width: 1024px)');
   * - const isXLarge = useMediaQuery('(min-width: 1536px)');
   * - console.log(isSmall, isMedium, isLarge, isXLarge )
   * - let Style = { placeItems: isLarge ? 'center' : 'unset'}
   * 
   */
   
const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

