"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  // Backward compatibility for classroom course outline Sidebar.tsx
  isOpen: boolean;
  toggle: () => void;
  close: () => void;

  // New Student Dashboard shell states
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_COLLAPSED_STORAGE_KEY = "airbharath_student_sidebar_collapsed";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Legacy / classroom sidebar state
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  // Desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Hydrate collapsed state from localStorage safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors (private browsing / disabled cookies)
    }
  }, []);

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors
    }
  };

  const toggleCollapse = () => {
    handleSetCollapsed(!isCollapsed);
  };

  const toggleMobile = () => setIsMobileOpen((prev) => !prev);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle,
        close,
        isCollapsed,
        setCollapsed: handleSetCollapsed,
        toggleCollapse,
        isMobileOpen,
        setMobileOpen: setIsMobileOpen,
        toggleMobile,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

