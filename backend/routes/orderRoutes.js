import express from "express";
import orderController from "../controller/orderControllers.js";
import { protect } from "../middleware/auth.js";
import { checkProjectPermission } from "../middleware/permissions.js";

const router = express.Router({ mergeParams: true });

router.get(
  "/orders/project/:projectId",
  protect,
  checkProjectPermission("orders", "view"),
  orderController.getOrdersByProject
);

router.post(
  "/orders/:projectId",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.createOrder
);

router.get(
  "/orders/:projectId/:id",
  protect,
  checkProjectPermission("orders", "view"),
  orderController.getOrderById
);

router.put(
  "/orders/:projectId/:id",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.updateOrder
);

router.delete(
  "/orders/:projectId/:id",
  protect,
  checkProjectPermission("orders", "edit"),
  orderController.deleteOrder
);

export default router;
