import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { AddReviewModal } from './AddReviewModal';

vi.mock('../../api/client', () => ({
  api: {
    createReview: vi.fn(),
  },
}));

afterEach(cleanup);

const project = {
  id: 19,
  title: 'Completed Baghdad installation',
  company_name: 'Rafidain Solar Systems',
  system_kwp: 8.4,
  location_governorate: 'Baghdad',
  location_district: 'Al-Jadriya',
};

function renderModal(onSubmitted = vi.fn()) {
  render(
    <LanguageProvider>
      <AddReviewModal
        project={project}
        accessToken="private-request-access-token-0123456789"
        onClose={vi.fn()}
        onSubmitted={onSubmitted}
      />
    </LanguageProvider>,
  );
  return onSubmitted;
}

describe('AddReviewModal', () => {
  it('submits multi-metric feedback with the private request token', async () => {
    vi.mocked(api.createReview).mockResolvedValue({
      id: 1,
      company_id: 3,
      company_name: project.company_name,
      project_id: project.id,
      project_title: project.title,
      system_kwp: project.system_kwp,
      location_governorate: project.location_governorate,
      location_district: project.location_district,
      client_name: 'Ahmed M.',
      rating: 4,
      communication_rating: 3,
      work_quality_rating: 5,
      comment: 'The installation was careful and finished on schedule.',
      is_verified: true,
      created_at: '2026-10-02T00:00:00Z',
    });
    const onSubmitted = renderModal();
    fireEvent.change(screen.getByLabelText('Overall rating'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Communication'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Work quality'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Your feedback'), {
      target: { value: 'The installation was careful and finished on schedule.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(api.createReview).toHaveBeenCalledWith({
      project_id: project.id,
      access_token: 'private-request-access-token-0123456789',
      rating: 4,
      communication_rating: 3,
      work_quality_rating: 5,
      comment: 'The installation was careful and finished on schedule.',
    }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  });

  it('shows a localized duplicate-review response', async () => {
    vi.mocked(api.createReview).mockRejectedValue(
      new Error('A review already exists for this completed project'),
    );
    renderModal();
    fireEvent.change(screen.getByLabelText('Your feedback'), {
      target: { value: 'The installation was careful and finished on schedule.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This completed project has already been reviewed.');
  });
});