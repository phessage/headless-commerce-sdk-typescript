import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HeadlessCommerceClient } from './client.js';

describe('cart HTTP integration', () => {
  const token = `hc_${'a'.repeat(43)}`;
  const items: Array<Record<string, unknown>> = [];
  let baseUrl = '';
  const server = createServer(async (request, response) => {
    const body = await new Promise<string>((resolve) => { let value=''; request.on('data',(chunk)=>value+=chunk); request.on('end',()=>resolve(value)); });
    if (request.headers['x-publishable-key'] !== 'pk_test_demo') { response.writeHead(401).end(); return; }
    if (request.url !== '/v1/headless/carts' && request.headers['x-cart-token'] !== token) { response.writeHead(404).end(); return; }
    if (request.method === 'POST' && request.url === '/v1/headless/carts/current/items') items.push({ id:'line-1', ...JSON.parse(body) });
    if (request.method === 'PATCH') Object.assign(items[0], JSON.parse(body));
    if (request.method === 'DELETE') items.splice(0);
    const payload = { data:{id:'cart-1',currency:'USD',items,totals:{subtotal:'0.00',tax:'0.00',taxIsEstimate:true,shipping:'0.00',discount:'0.00',total:'0.00'},expiresAt:'2026-09-30T00:00:00Z'},requestId:'req-1',...(request.url==='/v1/headless/carts'?{cartToken:token,created:true}:{}) };
    response.writeHead(request.url==='/v1/headless/carts'?201:200,{'content-type':'application/json'}).end(JSON.stringify(payload));
  });
  beforeAll(async () => { await new Promise<void>((resolve)=>server.listen(0,'127.0.0.1',resolve)); const address=server.address(); if(!address || typeof address==='string') throw new Error('server'); baseUrl=`http://127.0.0.1:${address.port}`; });
  afterAll(async () => { await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve())); });
  it('creates, restores, adds, updates and removes through real HTTP', async () => {
    const client = new HeadlessCommerceClient({baseUrl,publishableKey:'pk_test_demo'});
    expect((await client.carts.create()).cartToken).toBe(token);
    expect((await client.carts.addItem(token,{productId:'product-1',quantity:1})).data.items).toHaveLength(1);
    expect((await client.carts.updateItem(token,'line-1',3)).data.items[0].quantity).toBe(3);
    expect((await client.carts.get(token)).data.id).toBe('cart-1');
    expect((await client.carts.removeItem(token,'line-1')).data.items).toHaveLength(0);
  });
});
