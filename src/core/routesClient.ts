import { HttpAdapter, HttpRequest, HttpResponse } from '../adapters/http/httpAdapter';

export class RoutesClient {
    private httpAdapter: HttpAdapter;
    private apiKey: string;

    constructor(opts: {apiKey: string, httpAdapter: HttpAdapter}) {
        if (!opts.apiKey) {
            throw new Error('apiKey is required');
        }
        if (!opts.httpAdapter) {
            throw new Error('httpAdapter is required');
        }
        this.httpAdapter = opts.httpAdapter;
        this.apiKey = opts.apiKey;
    }

    async getRoutes(opts: {origin: string, destination: string}) : Promise<any> {
        const req: HttpRequest = {
            method: 'GET',
            url:  `https://maps.googleapis.com/maps/api/directions/json?origin=${opts.origin}&destination=${opts.destination}&key=${this.apiKey}`,
        };
        const res = await this.httpAdapter.sendRequest(req);
        return res.body;
    }
}


