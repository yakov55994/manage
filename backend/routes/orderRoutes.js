import express from 'express'
import { protect } from '../middleware/auth.js';
import { checkProjectPermission } from '../middleware/permissions.js';
import orderController from '../controller/orderControllers.js'


const router = express.Router({ mergeParams: true });

router.get(
  "/",
  protect,
  checkProjectPermission("orders", "view"),
  orderController.getOrdersByProject
);

router.post(
  "/",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.createOrder
);

router.get(
  "/:id",
  protect,
  checkProjectPermission("orders", "view"),
  orderController.getOrderById
);

router.put(
  "/:id",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.updateOrder
);

router.delete(
  "/:id",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.deleteOrder
);

export default router
