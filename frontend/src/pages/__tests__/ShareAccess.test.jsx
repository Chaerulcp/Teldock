import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShareAccess from '../ShareAccess';
import { publicShareApi } from '../../services/api';
import { useThemeStore } from '../../store/theme-store';

// The public share endpoint is the only external dependency of this page.
vi.mock('../../services/api', () => ({
  publicShareApi: {
    get: vi.fn(),
    download: vi.fn(),
  },
}));

const READY_FILE = {
  id: 'file-1',
  originalFilename: 'report.pdf',
  displayFilename: 'report.pdf',
  mimeType: 'application/pdf',
  fileSize: 2048,
  isEncrypted: false,
  uploadedAt: '2024-01-15T00:00:00.000Z',
};

const READY_RESPONSE = {
  data: {
    success: true,
    data: {
      file: READY_FILE,
      expiresAt: null,
      allowDownload: true,
      usedDownloads: 0,
      downloadLimit: null,
    },
  },
};

// `requiresPassword` sits at the TOP level of the response body.
const PASSWORD_RESPONSE = {
  data: {
    success: true,
    requiresPassword: true,
    data: { fileName: 'secret.pdf', fileId: 'file-2' },
  },
};

function renderShareAccess() {
  return render(
    <MemoryRouter initialEntries={['/s/test-token']}>
      <Routes>
        <Route path="/s/:token" element={<ShareAccess />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  publicShareApi.get.mockReset();
  publicShareApi.download.mockReset();
  localStorage.clear();
  useThemeStore.setState({ theme: 'light' });
});

describe('ShareAccess', () => {
  it('shows a loading indicator while the metadata request is in flight', async () => {
    let resolveGet;
    publicShareApi.get.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }),
    );

    renderShareAccess();

    expect(screen.getByText(/preparing your file/i)).toBeInTheDocument();

    // Resolve so the pending promise does not leak into other tests.
    resolveGet(READY_RESPONSE);
    expect(await screen.findByRole('heading', { name: 'report.pdf' })).toBeInTheDocument();
  });

  it('renders the password form and the filename when a password is required', async () => {
    publicShareApi.get.mockResolvedValue(PASSWORD_RESPONSE);

    renderShareAccess();

    expect(
      await screen.findByRole('heading', { name: /this file is protected/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('secret.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows an inline error and keeps the form when the password is wrong', async () => {
    publicShareApi.get
      .mockResolvedValueOnce(PASSWORD_RESPONSE)
      .mockRejectedValueOnce({
        response: {
          status: 401,
          data: { success: false, error: 'Incorrect password' },
        },
      });

    renderShareAccess();
    await screen.findByRole('heading', { name: /this file is protected/i });

    const user = userEvent.setup();
    // The submit handler keeps updating state after the awaited request
    // settles, so the interaction is flushed inside act to avoid warnings.
    await act(async () => {
      await user.type(screen.getByLabelText('Password'), 'wrong-password');
      await user.click(screen.getByRole('button', { name: /unlock file/i }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');
    // Still on the password form: no redirect, no crash.
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlock file/i })).toBeInTheDocument();
  });

  it('renders the filename, formatted size and a download button when ready', async () => {
    publicShareApi.get.mockResolvedValue(READY_RESPONSE);

    renderShareAccess();

    expect(await screen.findByRole('heading', { name: 'report.pdf' })).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('hides the download button and explains when the owner disabled downloads', async () => {
    publicShareApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          file: { ...READY_FILE, id: 'file-3' },
          expiresAt: null,
          allowDownload: false,
          usedDownloads: 0,
          downloadLimit: null,
        },
      },
    });

    renderShareAccess();

    expect(await screen.findByRole('heading', { name: 'report.pdf' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/owner disabled downloads/i)).toBeInTheDocument();
  });

  it('displays the server message when the link is expired or out of downloads', async () => {
    publicShareApi.get.mockRejectedValue({
      response: {
        status: 403,
        data: {
          success: false,
          error: 'This shared link has expired or reached download limit',
        },
      },
    });

    renderShareAccess();

    expect(
      await screen.findByText('This shared link has expired or reached download limit'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /this link can't be opened/i }),
    ).toBeInTheDocument();
  });

  it('displays the message when the file is no longer available', async () => {
    publicShareApi.get.mockRejectedValue({
      response: {
        status: 404,
        data: { success: false, error: 'File no longer available' },
      },
    });

    renderShareAccess();

    expect(await screen.findByText('File no longer available')).toBeInTheDocument();
  });
});
