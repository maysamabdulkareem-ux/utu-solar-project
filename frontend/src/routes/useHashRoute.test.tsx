import { cleanup, act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHashRoute } from './useHashRoute';

function RouteHarness() {
  const { route } = useHashRoute();
  return <p>{route}</p>;
}

beforeEach(() => {
  window.history.replaceState(null, '', '#/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('useHashRoute', () => {
  it('smoothly returns to the top on route changes, not query-only updates', () => {
    render(<RouteHarness />);

    act(() => {
      window.history.replaceState(null, '', '#/request');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByText('request')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' });

    const scrollCount = vi.mocked(window.scrollTo).mock.calls.length;
    act(() => {
      window.history.replaceState(null, '', '#/request?open=project-1');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(vi.mocked(window.scrollTo)).toHaveBeenCalledTimes(scrollCount);
  });
});
