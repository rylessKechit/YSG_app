// app/(dashboard)/preparations/layout.tsx
'use client';

import React from 'react';

interface PreparationsLayoutProps {
  children: React.ReactNode;
}

const PreparationsLayout: React.FC<PreparationsLayoutProps> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};

export default PreparationsLayout;