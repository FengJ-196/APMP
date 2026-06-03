import LoginPage from './page';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof LoginPage> = {
  title: 'Screens/Authentication/Login Screen',
  component: LoginPage,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/login',
      },
    },
    backgrounds: { default: 'dark' },
  },
};

export default meta;
type Story = StoryObj<typeof LoginPage>;

export const NormalState: Story = {
  decorators: [
    (Story) => {
      // Mock idle fetch handler
      global.fetch = () => new Promise(() => {});
      return <Story />;
    },
  ],
};

export const AuthenticationError: Story = {
  decorators: [
    (Story) => {
      // Mock failed credentials response
      global.fetch = () => Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid user credentials. Please double check email and password.' }),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    // Populate form fields to demonstrate validation values
    const emailInput = canvasElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = canvasElement.querySelector('#login-password') as HTMLInputElement;
    const submitBtn = canvasElement.querySelector('#login-submit') as HTMLButtonElement;

    if (emailInput && passwordInput && submitBtn) {
      emailInput.value = 'invalid-email@company.com';
      passwordInput.value = 'wrongpassword123';
      // Trigger native input updates
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Simulate form submit to trigger mocked error alert
      submitBtn.click();
    }
  },
};

export const AuthenticatedSuccess: Story = {
  decorators: [
    (Story) => {
      // Mock successful auth tokens response
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          tokens: {
            accessToken: 'mock-access-jwt-token',
            refreshToken: 'mock-refresh-jwt-token',
          },
          user: {
            id: 'mock-user-123',
            email: 'admin@apmp.io',
          },
        }),
      } as Response);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const emailInput = canvasElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = canvasElement.querySelector('#login-password') as HTMLInputElement;
    const submitBtn = canvasElement.querySelector('#login-submit') as HTMLButtonElement;

    if (emailInput && passwordInput && submitBtn) {
      emailInput.value = 'admin@apmp.io';
      passwordInput.value = 'supersecurepassword123';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Submit to visual transition check
      submitBtn.click();
    }
  },
};
