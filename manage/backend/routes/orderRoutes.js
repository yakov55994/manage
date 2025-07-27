import express from 'express';
import orderControllers from '../controller/orderControllers.js';

const router = express.Router();

router.post('/', orderControllers.createOrders);

router.get('/search', orderControllers.search);

router.get('/', orderControllers.getAllOrders);

router.get('/:id', orderControllers.getOrderById);

router.put('/:id', orderControllers.updateOrder);

router.delete('/:id', orderControllers.deleteOrder);


export default router;