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

  it('deve enviar requisição POST com body JSON', async () => {
    const adapter = new FetchAdapter();
    const req: HttpRequest = {
      method: 'POST',
      url: 'https://httpbin.org/post',
      body: { test: 'data' },
      headers: { 'Content-Type': 'application/json' }
    };
    const res = await adapter.sendRequest(req);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('deve retornar erro para URL inválida', async () => {
    const adapter = new FetchAdapter();
    const req: HttpRequest = { method: 'GET', url: 'https://httpbin.org/status/404' };
    
    const res = await adapter.sendRequest(req);
    expect(res.status).toBe(404);
  });
});
