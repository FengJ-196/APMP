import Navbar from './Navbar';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navigation/Navbar',
  component: Navbar,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const GuestUser: Story = {
  decorators: [
    (Story) => {
      // Mock local storage missing token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
      }
      return <Story />;
    },
  ],
};

export const LoggedInUser: Story = {
  decorators: [
    (Story) => {
      // Mock active local storage session token
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', 'mock-access-token');
      }
      return <Story />;
    },
  ],
};
