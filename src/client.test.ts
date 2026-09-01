import { describe, expect, it, vi } from 'vitest';
import { HeadlessCommerceClient } from './client.js';
const page = { data:[{id:'p1',slug:'trail-pack',name:'Trail Pack',description:'Demo',imageUrl:'/pack.svg',price:{amount:'89.00',currency:'USD'},available:true}],nextCursor:null,requestId:'req_1' };
describe('HeadlessCommerceClient', () => {
  it('constructs a tenant-bound client from one store ID', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { storeId: 'store-a', apiUrl: 'https://sandbox.test', publishableKey: 'pk_test_demo', apiVersion: 'v1', capabilities: ['catalog', 'cart', 'checkout-preparation'] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], nextCursor: null, requestId: 'r' }), { status: 200 }));
    const client = await HeadlessCommerceClient.forStore({ storeId: 'store-a', fetch: fetcher });
    await client.products.list();
    expect(fetcher.mock.calls[0][0]).toBe('https://api.1ecomm.com/v1/headless/stores/store-a/config');
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ 'x-publishable-key': 'pk_test_demo' });
  });
  it('sends public tenant context and parses products', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(page),{status:200}));
    const client = new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'pk_test_demo',fetch:fetcher as typeof fetch});
    expect((await client.products.list({limit:10})).data[0].name).toBe('Trail Pack');
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({'x-publishable-key':'pk_test_demo'});
    expect(String(fetcher.mock.calls[0][0])).toContain('/v1/headless/products');
  });
  it('retries safe reads and returns typed problems', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify({type:'x',title:'Not found',status:404,requestId:'req_2'}),{status:404}));
    const client = new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'pk_test_demo',fetch:fetcher,maxRetries:1});
    await expect(client.products.list()).rejects.toMatchObject({problem:{status:404,requestId:'req_2'}});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects confidential-looking credentials', () => { expect(() => new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'secret'})).toThrow('publishable key'); });
  it('uses the detail and category contract routes', async () => {
    const fetcher = vi.fn(async (url: URL | RequestInfo) => new Response(JSON.stringify(String(url).endsWith('/categories') ? {data:[],requestId:'c'} : {data:page.data[0],requestId:'p'}),{status:200}));
    const client = new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'pk_test_demo',fetch:fetcher as typeof fetch});
    await client.products.get('p/1'); await client.categories.list();
    expect(String(fetcher.mock.calls[0][0])).toContain('/v1/headless/products/p%2F1');
    expect(String(fetcher.mock.calls[1][0])).toContain('/v1/headless/products/categories');
  });
  it('sends cart capability tokens and never retries mutations', async () => {
    const fetcher = vi.fn(async () => new Response('{}',{status:503,statusText:'Unavailable'}));
    const client = new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'pk_test_demo',fetch:fetcher as typeof fetch,maxRetries:2});
    await expect(client.carts.addItem('hc_token',{productId:'p1',quantity:2})).rejects.toMatchObject({problem:{status:503}});
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({method:'POST',headers:{'x-cart-token':'hc_token'},body:JSON.stringify({productId:'p1',quantity:2})});
  });
  it('uses checkout preparation routes and never retries checkout mutations', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({data:{ready:false,missing:[]},requestId:'r'}),{status:200}));
    const client = new HeadlessCommerceClient({baseUrl:'https://sandbox.test',publishableKey:'pk_test_demo',fetch:fetcher as typeof fetch,maxRetries:2});
    await client.carts.getCheckout('hc_token');
    await client.carts.updateCheckout('hc_token',{billingAddress:{country:'CA'}});
    await client.carts.selectShippingMethod('hc_token','ship-id');
    await client.carts.selectPaymentMethod('hc_token','pay-id');
    expect(fetcher.mock.calls.map((call)=>[String(call[0]),call[1]?.method])).toEqual([
      ['https://sandbox.test/v1/headless/carts/current/checkout','GET'],
      ['https://sandbox.test/v1/headless/carts/current/checkout','PATCH'],
      ['https://sandbox.test/v1/headless/carts/current/checkout/shipping-method','PUT'],
      ['https://sandbox.test/v1/headless/carts/current/checkout/payment-method','PUT'],
    ]);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({'x-cart-token':'hc_token'});
  });
});
