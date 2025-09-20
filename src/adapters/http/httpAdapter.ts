export interface HttpRequest {
    method: 'GET' | 'POST';
    url: string;
    body?: any;
    headers?: Record<string, string>;
}

export interface HttpResponse<T = any> {
    status: number;
    body: T;
    headers: Record<string, string>;
}

export interface HttpAdapter {
    /**
     * Send a request to the HTTP server.
     * @param request - The request to send.
     * @returns The response from the server.
     */
    sendRequest<T = any>(request: HttpRequest): Promise<HttpResponse<T>>;
}