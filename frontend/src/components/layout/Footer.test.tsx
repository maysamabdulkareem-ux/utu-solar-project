import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { Footer } from './Footer';

const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as null | { role: 'company' | 'client' | 'admin' },
    isLoading: false,
    openCompanyRegistrationModal: vi.fn(),
  },
}));

vi.mock('../../state/AuthContext', () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  vi.unstubAllEnvs();
});

function renderFooter(user: typeof authState.user = null) {
  authState.user = user;
  authState.isLoading = false;
  authState.openCompanyRegistrationModal.mockReset();
  const scrollIntoView = vi.fn();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  const result = render(
    <LanguageProvider>
      <Footer />
      <div id="top" />
      <div id="companies" />
      <div id="projects" />
      <div id="calculator" />
      <div id="services" />
      <div id="how-it-works" />
      <div id="reviews" />
      <div id="contact" />
    </LanguageProvider>,
  );
  return [result, scrollIntoView] as const;
}

describe('Footer quick links', () => {
  it.each([
    ['Home', '#top'],
    ['Solar Companies', '#companies'],
    ['Projects', '#projects'],
    ['Solar Calculator', '#calculator'],
    ['How It Works', '#how-it-works'],
    ['Services', '#services'],
    ['Request a Quote', '#/rfq'],
    ['Customer reviews', '#reviews'],
  ])('navigates %s to %s', (label, href) => {
    const [, scrollIntoView] = renderFooter();
    const link = screen.getByRole('link', { name: label });

    expect(link).toHaveAttribute('href', href);
    fireEvent.click(link);
    expect(window.location.hash).toBe(href);

    if (!href.startsWith('#/')) {
      expect(document.getElementById(href.slice(1))).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    }
  });

  it('opens configured social destinations safely in a new tab', () => {
    vi.stubEnv('VITE_SOCIAL_FACEBOOK', 'https://www.facebook.com/utu');
    renderFooter();

    const link = screen.getByRole('link', { name: 'Utu on Facebook' });
    expect(link).toHaveAttribute('href', 'https://www.facebook.com/utu');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('hides unconfigured social destinations instead of linking back to the page', () => {
    renderFooter();

    expect(screen.queryByRole('link', { name: 'Utu on Facebook' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Utu on Instagram' })).not.toBeInTheDocument();
  });

  it('does not render an FAQ or quick support link', () => {
    renderFooter();
    expect(screen.queryByRole('link', { name: /FAQ|Quick Support/i })).not.toBeInTheDocument();
  });

  it('opens Contact Us as a contact dialog instead of navigating to the RFQ form', () => {
    renderFooter();
    fireEvent.click(screen.getByRole('link', { name: 'Contact Us' }));

    expect(screen.getByRole('dialog', { name: 'Contact Us' })).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByText('support@utu-solar.iq')).toBeInTheDocument();
    expect(screen.getByText('+964 770 000 0000')).toBeInTheDocument();
    expect(window.location.hash).not.toBe('#/rfq');
  });

  it('submits the contact form, clears it, closes the dialog, and shows success feedback', () => {
    renderFooter();
    fireEvent.click(screen.getByRole('link', { name: 'Contact Us' }));

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Help with my account' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please contact me.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Thank you for reaching out! Our team will get back to you shortly.',
    );

    fireEvent.click(screen.getByRole('link', { name: 'Contact Us' }));
    expect(screen.getByLabelText('Subject')).toHaveValue('');
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });

  it.each(['Join Marketplace', 'Add Your Company', 'Manage Projects'])(
    'opens company registration over the current page for logged-out visitors via %s',
    (label) => {
      renderFooter();
      window.location.hash = '#top';
      fireEvent.click(screen.getByRole('link', { name: label }));

      expect(authState.openCompanyRegistrationModal).toHaveBeenCalledOnce();
      expect(window.location.hash).toBe('#top');
    },
  );

  it.each(['Join Marketplace', 'Add Your Company', 'Manage Projects'])(
    'routes a signed-in company to its workspace via %s',
    (label) => {
      renderFooter({ role: 'company' });
      fireEvent.click(screen.getByRole('link', { name: label }));

      expect(authState.openCompanyRegistrationModal).not.toHaveBeenCalled();
      expect(window.location.hash).toBe('#/company');
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    },
  );

  it('opens the Terms and Privacy dialogs from their footer links', () => {
    renderFooter();

    fireEvent.click(screen.getByRole('link', { name: 'Privacy Policy' }));
    expect(screen.getByRole('dialog', { name: 'Privacy Policy' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('link', { name: 'Terms & Conditions' }));
    expect(screen.getByRole('dialog', { name: 'Terms & Conditions' })).toBeInTheDocument();
  });

  it('resets scroll when navigating to a routed view', () => {
    renderFooter();
    fireEvent.click(screen.getByRole('link', { name: 'Request a Quote' }));

    expect(window.location.hash).toBe('#/rfq');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});