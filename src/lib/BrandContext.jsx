import { createContext, useContext, useState } from 'react';

const BrandContext = createContext({ brand: 'all', setBrand: () => {} });

export function BrandProvider({ children }) {
  const [brand, setBrand] = useState('all');
  return (
    <BrandContext.Provider value={{ brand, setBrand }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
