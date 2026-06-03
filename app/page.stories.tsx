import Home from './page';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Home> = {
  title: 'Screens/Landing Page',
  component: Home,
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
type Story = StoryObj<typeof Home>;

export const Loading: Story = {
  decorators: [
    (Story) => {
      // Mock delayed fetch to showcase loading state
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const EmptyState: Story = {
  decorators: [
    (Story) => {
      // Mock empty projects list response
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as Response);
      return <Story />;
    },
  ],
};

export const WithProjects: Story = {
  decorators: [
    (Story) => {
      // Mock active projects list response
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            id: 'proj-101',
            title: 'Synthetic Smart Contracts Specification',
            status: 'Active',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
          },
          {
            id: 'proj-102',
            title: 'Multimodal Warehouse Logic Flow',
            status: 'Reviewed',
            created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
          },
          {
            id: 'proj-103',
            title: 'APMP Core Reasoner Design Document',
            status: 'Approved',
            created_at: new Date().toISOString(),
          },
        ]),
      } as Response);
      return <Story />;
    },
  ],
};
