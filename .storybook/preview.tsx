import type { Preview } from '@storybook/react';
import '../app/globals.css'; // Load global CSS styles & tailwind system tokens

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0B1120' }, // APMP Design System default dark base color
        { name: 'surface', value: '#0F172A' }, // APMP elevated surface background
        { name: 'elevated', value: '#1E293B' },
      ],
    },
  },
};

export default preview;