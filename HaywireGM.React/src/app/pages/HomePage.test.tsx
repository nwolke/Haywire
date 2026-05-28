import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/app/pages/HomePage';

const useAuthMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoggingIn: false,
      loginWithCognito: vi.fn(),
      logout: vi.fn(),
      user: null,
    });
  });

  it('renders HaywireGM branding for signed-out users', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'HaywireGM' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome to haywiregm/i })).toBeInTheDocument();
    expect(screen.getByText(/your ttrpg companion/i)).toBeInTheDocument();
  });
});
