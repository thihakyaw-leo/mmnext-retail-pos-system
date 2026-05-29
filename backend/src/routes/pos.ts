import { Hono } from 'hono';
import { authMiddleware as auth } from '../middleware/auth.js';
import { rbacMiddleware as rbac } from '../middleware/rbac.js';
import { PosController } from '../controllers/posController.js';

const pos = new Hono();

// Protect all POS routes - Admins, Managers, and Cashiers have access
pos.use('*', auth, rbac(['admin', 'manager', 'cashier']));

// Get all required data to initialize the POS terminal (products, categories, promos)
pos.get('/init', PosController.initPos);

// Held Carts management
pos.post('/carts/hold', PosController.holdCart);
pos.get('/carts/held', PosController.getHeldCarts);
pos.delete('/carts/held/:cartId', PosController.deleteHeldCart);

export default pos;
