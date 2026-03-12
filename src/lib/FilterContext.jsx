import { createContext, useContext, useState } from 'react';

const FilterContext = createContext({
  seller: 'all',
  setSeller: () => {},
  period: '30',
  setPeriod: () => {},
});

export function FilterProvider({ children }) {
  const [seller, setSeller] = useState('all');
  const [period, setPeriod] = useState('30');
  return (
    <FilterContext.Provider value={{ seller, setSeller, period, setPeriod }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
