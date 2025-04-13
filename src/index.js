import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // Import HashRouter
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css'; // Import Mantine core styles
import './styles/index.css'; // Keep your existing global styles if needed
import App from './App';

// Define the custom theme
const theme = createTheme({
  primaryColor: 'acidOrange',
  colors: {
    // Define the 10 shades for acidOrange, with #FF9500 as index 6
    acidOrange: [
      '#fff0e0', // Lighter shades
      '#ffddb3',
      '#ffca85',
      '#ffb757',
      '#ffa42e',
      '#ff9a0f',
      '#FF9500', // Primary shade (index 6)
      '#e08000', // Darker shades
      '#c26e00',
      '#a35b00'
    ],
    // You can add other custom color arrays here if needed
    // Or override specific theme colors directly
    darkGray: ['#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333', '#333333'], // Simple array for direct use
    warningRed: ['#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938', '#ED2938'],
    errorRed: ['#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C', '#C62C2C'],
  },
  // Set default radius for components like Card, Button, etc. 'md' is 8px by default.
  defaultRadius: 'md',

  // Define other theme properties
  black: '#000000',
  white: '#FFFFFF',

  // Example: Default props for Card
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm', // Subtle drop shadow
        padding: 'md',
        withBorder: true,
      }
    },
    Button: {
      defaultProps: {
        // Default button styles can be set here
        radius: 'md',
      }
    }
    // Define default props for other components as needed
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <HashRouter> {/* Wrap App with HashRouter */}
        <App />
      </HashRouter>
    </MantineProvider>
  </React.StrictMode>
);