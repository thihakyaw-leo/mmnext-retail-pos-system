import { theme } from 'antd';

// Premium Dark Theme customized for Enterprise POS
const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#3b82f6', // A modern blue
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    
    // Typography
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    
    // Layout Colors
    colorBgLayout: '#0f172a', // Deep slate for background
    colorBgContainer: '#1e293b', // Slightly lighter slate for cards
    colorBgElevated: '#334155', // Dropdowns and popovers
    
    // Borders
    borderRadius: 8,
    colorBorder: '#334155',
    
    // Interactivity
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#1e293b',
      siderBg: '#1e293b',
    },
    Card: {
      colorBorderSecondary: 'transparent',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    Menu: {
      itemBg: '#1e293b',
      itemSelectedBg: '#3b82f620',
      itemHoverBg: '#334155',
    },
    Table: {
      headerBg: '#0f172a',
      rowHoverBg: '#334155',
    }
  }
};

export default themeConfig;
