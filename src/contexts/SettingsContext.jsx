import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [orgSettings, setOrgSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await axiosClient.get('/organization');
      if (response?.data) {
        // Ensure default settings structure exists if empty
        const data = response.data;
        if (!data.settings) data.settings = {};
        
        // Defaults if missing
        if (data.settings.allow_discount === undefined) data.settings.allow_discount = true;
        if (data.settings.max_discount_percent === undefined) data.settings.max_discount_percent = 50;
        if (data.settings.auto_print_receipt === undefined) data.settings.auto_print_receipt = true;
        
        setOrgSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch org settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ orgSettings, refreshSettings: fetchSettings, loadingSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
