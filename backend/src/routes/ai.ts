import { Hono } from 'hono';
import { AIController } from '../controllers/aiController.js';
import { Bindings } from '../types/env.js';

const aiRoutes = new Hono<Bindings>();
const aiController = new AIController();

aiRoutes.post('/smart-search', (c) => aiController.smartSearch(c));

export default aiRoutes;
