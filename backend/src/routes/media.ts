import { Hono } from 'hono';
import { Bindings } from '../types/env.js';

const media = new Hono<Bindings>();

media.get('/*', async (c) => {
  // Extract the path after /api/media/
  // The route is registered as app.route('/api/media', media)
  // So c.req.path will be like /api/media/orgId/products/file.png
  // We need to strip the /api/media/ part to get the R2 key
  
  const path = c.req.path;
  const keyMatch = path.match(/^\/api\/media\/(.+)$/);
  
  if (!keyMatch || !keyMatch[1]) {
    return c.text('Invalid media path', 400);
  }
  
  const key = decodeURIComponent(keyMatch[1]);
  
  try {
    const object = await c.env.R2.get(key);
    
    if (object === null) {
      return c.text('Not Found', 404);
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    
    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Error fetching from R2:', error);
    return c.text('Internal Server Error', 500);
  }
});

export default media;
