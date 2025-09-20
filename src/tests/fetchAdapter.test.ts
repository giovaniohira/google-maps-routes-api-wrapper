import { FetchAdapter } from '../adapters/http/fetchAdapter';
import { HttpRequest } from '../adapters/http/httpAdapter';

describe('FetchAdapter', () => {
  it('deve enviar requisição GET e receber status', async () => {
    const adapter = new FetchAdapter();
    const req: HttpRequest = { method: 'GET', url: 'https://httpbin.org/get' };
    const res = await adapter.sendRequest(req);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
});
