"use client";

import { Provider } from "react-redux";
import { store } from "@/store/index.js";
import { ChatProvider } from "@/context/ChatContext.jsx";
import ChatDrawer from "@/components/ChatDrawer.jsx";

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ChatProvider>
        {children}
        <ChatDrawer />
      </ChatProvider>
    </Provider>
  );
}
