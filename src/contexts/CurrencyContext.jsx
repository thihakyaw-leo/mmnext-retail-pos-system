import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext(null);

export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', rate: 1, precision: 2 },
  MMK: { code: 'MMK', symbol: 'Ks ', rate: 3500, precision: 0 },
  THB: { code: 'THB', symbol: '฿', rate: 35, precision: 0 }
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const saved = localStorage.getItem('mmnext_currency');
    if (saved && CURRENCIES[saved]) {
      setCurrency(saved);
    }
  }, []);

  const changeCurrency = (code) => {
    if (CURRENCIES[code]) {
      setCurrency(code);
      localStorage.setItem('mmnext_currency', code);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = Number(amount) || 0;
    const { symbol, rate, precision, code } = CURRENCIES[currency];
    
    const converted = numAmount * rate;
    
    // Format with commas
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });

    // Special formatting for MMK to put symbol at end, or standard at front
    if (code === 'MMK') {
      return `${formatted} ${symbol.trim()}`;
    }
    
    return `${symbol}${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      currencyConfig: CURRENCIES[currency], 
      changeCurrency, 
      formatCurrency 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
