import fetch from 'node-fetch';
import { HttpAdapter, HttpRequest, HttpResponse } from './httpAdapter';

export class FetchAdapter implements HttpAdapter {
  async sendRequest<T = any>(request: HttpRequest): Promise<HttpResponse<T>> {
    const response = await fetch(request.url, {
      method: request.method,
      body: request.body ? JSON.stringify(request.body) : undefined,
      headers: request.headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const body: T = contentType.includes('application/json')
      ? (await response.json() as T)
      : (await response.text() as T);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      status: response.status,
      body,
      headers,
    };
  }
}
