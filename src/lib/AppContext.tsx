import React, { createContext, useContext } from 'react';

// Using 'any' temporarily to accelerate the refactoring of a 6,000 line file.
// We can strongly type this later.
export const AppContext = createContext<any>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
