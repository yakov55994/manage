// routes/order.routes.js
import express from 'express';
import orderControllers from '../controller/orderControllers.js';


const router = express.Router();

router.get(
  '/',  orderControllers.getAllOrders    // דאג שהקונטרולר יקרא מ-req.queryFilter אם קיים
);

router.get(
  '/search',
  orderControllers.search
);

router.get(
  '/:id',
  orderControllers.getOrderById
);

router.post(
  '/',
  orderControllers.createOrders
);

router.put(
  '/:id',
  orderControllers.updateOrder
);

router.delete(
  '/:id',
  orderControllers.deleteOrder
);

export default router;
