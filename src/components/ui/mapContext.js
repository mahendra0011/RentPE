import { createContext, useContext } from "react";

export const MapContext = createContext({ map: null, isLoaded: false });

export function useMap() {
  return useContext(MapContext);
}
