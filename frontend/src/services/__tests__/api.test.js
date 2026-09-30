import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the two axios instances `api.js` creates (the shared authenticated
// client and the isolated public client) without ever hitting the network.
const mocks = vi.hoisted(() => {
  const instances = [];
  const createInstance = () => {
    const instance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    instances.push(instance);
    return instance;
  };
  return { instances, createInstance };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(mocks.createInstance),
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { publicShareApi } from '../api';

const sharedApi = mocks.instances[0];
const publicApi = mocks.instances[1];

beforeEach(() => {
  // Only clear call history, not interceptor registration records.
  sharedApi.get.mockClear();
  publicApi.get.mockClear();
});

describe('publicShareApi', () => {
  it('requests metadata with a URL-encoded token and no password header by default', () => {
    publicShareApi.get('test token/1');

    expect(publicApi.get).toHaveBeenCalledTimes(1);
    expect(publicApi.get).toHaveBeenCalledWith('/files/s/test%20token%2F1', {
      headers: {},
    });
  });

  it('sends the password as the X-Share-Password header when provided', () => {
    publicShareApi.get('tok', 's3cret');

    expect(publicApi.get).toHaveBeenCalledWith('/files/s/tok', {
      headers: { 'X-Share-Password': 's3cret' },
    });
  });

  it('downloads via the same endpoint with download=true and a blob response', () => {
    publicShareApi.download('tok', 's3cret');

    expect(publicApi.get).toHaveBeenCalledWith('/files/s/tok', {
      params: { download: true },
      headers: { 'X-Share-Password': 's3cret' },
      responseType: 'blob',
    });
  });

  it('omits the password header on download when no password is supplied', () => {
    publicShareApi.download('tok');

    expect(publicApi.get).toHaveBeenCalledWith('/files/s/tok', {
      params: { download: true },
      headers: {},
      responseType: 'blob',
    });
  });
});

describe('public share client isolation', () => {
  it('uses a client that registers none of the shared auth/401 interceptors', () => {
    // The shared client wires up the Authorization + refresh-token interceptors.
    expect(sharedApi.interceptors.request.use).toHaveBeenCalled();
    expect(sharedApi.interceptors.response.use).toHaveBeenCalled();

    // The public client must register neither. This is what guarantees a 401
    // from the public endpoint (wrong password) can never reach the
    // refresh-token flow and bounce an anonymous visitor to /login.
    expect(publicApi.interceptors.request.use).not.toHaveBeenCalled();
    expect(publicApi.interceptors.response.use).not.toHaveBeenCalled();

    // And public share traffic is routed to that isolated client.
    publicShareApi.get('tok');
    expect(publicApi.get).toHaveBeenCalledTimes(1);
    expect(sharedApi.get).not.toHaveBeenCalled();
  });
});
