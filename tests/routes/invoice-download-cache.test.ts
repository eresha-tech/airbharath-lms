import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: vi.fn(), admin: vi.fn(), order: vi.fn(), invoice: vi.fn(), generate: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({ getSession: mocks.session }));
vi.mock('@/lib/admin-authorization', () => ({ hasPersistedAdminRole: mocks.admin }));
vi.mock('@/lib/db', () => ({ db: { query: { orders: { findFirst: mocks.order }, invoices: { findFirst: mocks.invoice } } } }));
vi.mock('@/lib/invoice-generator', () => ({ generateAndSaveInvoice: mocks.generate }));
import { GET } from '@/app/api/invoices/download/[orderId]/route';

const bytes = Buffer.from('%PDF-1.7\nIsolated synthetic invoice\n%%EOF');
const saved = { invoiceNumber: 'SYNTHETIC-INVOICE', pdfUrl: `data:application/pdf;base64,${bytes.toString('base64')}` };
const request = () => GET(new Request('http://localhost/api/invoices/download/synthetic-order'), { params: Promise.resolve({ orderId: 'synthetic-order' }) });
const privateResponse = (response: Response, status: number) => {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ id: 'synthetic-owner', role: 'student' });
  mocks.admin.mockResolvedValue(false);
  mocks.order.mockResolvedValue({ id: 'synthetic-order', userId: 'synthetic-owner' });
  mocks.invoice.mockResolvedValue(saved);
  mocks.generate.mockResolvedValue(saved);
});

describe('Private invoice download caching preserves authorization and PDF bytes', () => {
  it('rejects anonymous before any financial query', async () => {
    mocks.session.mockResolvedValue(null);
    const response = await request(); privateResponse(response, 401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mocks.order).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('rejects cross-owner and demoted-admin claims without reading invoice or generating one', async () => {
    mocks.session.mockResolvedValue({ id: 'synthetic-other', role: 'admin' });
    const response = await request(); privateResponse(response, 403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
    expect(mocks.admin).toHaveBeenCalled(); expect(mocks.invoice).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('keeps missing-order response private', async () => {
    mocks.order.mockResolvedValue(null);
    const response = await request(); privateResponse(response, 404);
    expect(await response.json()).toEqual({ error: 'Order not found' }); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('serves the existing PDF without regeneration, repricing or changing its filename', async () => {
    const response = await request(); privateResponse(response, 200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="SYNTHETIC-INVOICE.pdf"');
    expect(response.headers.get('content-length')).toBe(String(bytes.length)); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('preserves persisted-admin authorization on the existing PDF path', async () => {
    mocks.session.mockResolvedValue({ id: 'synthetic-admin', role: 'admin' }); mocks.admin.mockResolvedValue(true);
    privateResponse(await request(), 200); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('keeps the missing-invoice generation path private using an isolated mock only', async () => {
    mocks.invoice.mockResolvedValue(null);
    const response = await request(); privateResponse(response, 200);
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith('synthetic-order');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });
  it.each([null, { invoiceNumber: 'SYNTHETIC', pdfUrl: null }])('keeps failed PDF generation private', async value => {
    mocks.invoice.mockResolvedValue(null); mocks.generate.mockResolvedValue(value);
    const response = await request(); privateResponse(response, 500);
    expect(await response.json()).toEqual({ error: 'Failed to generate invoice PDF' });
  });
  it('keeps unexpected failures private', async () => {
    mocks.order.mockRejectedValue(new Error('Synthetic database failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try { privateResponse(await request(), 500); } finally { log.mockRestore(); }
  });
});
