import { HttpAdapter, HttpRequest, HttpResponse } from './httpAdapter';

export class BrowserFetchAdapter implements HttpAdapter {
  async sendRequest<T = any>(request: HttpRequest): Promise<HttpResponse<T>> {
    // Convert Google Maps API URL to use local proxy
    let proxyUrl = request.url;
    if (request.url.includes('maps.googleapis.com')) {
      proxyUrl = request.url.replace('https://maps.googleapis.com', '/api/google-maps');
    }

    const response = await fetch(proxyUrl, {
      method: request.method,
      body: request.body ? JSON.stringify(request.body) : undefined,
      headers: {
        ...request.headers,
        'Content-Type': 'application/json',
      },
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
