import express from "express";
import { protect } from "../middleware/auth.js";
import orderController from "../controller/orderControllers.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();

router.get("/search", protect, orderController.searchOrders);

// 🟢 קודם ROUTES שיש להם שמות ייחודיים
router.post(
  "/bulk",
  protect,
  checkAccess("order", "edit"),
  orderController.createBulkOrders
);

// 🟢 root
router.get(
  "/",
  protect,
  orderController.getOrders
);

// 🟢 לבסוף ID
router.get(
  "/:id",
  protect,
  checkAccess("order", "view"),
  orderController.getOrderById
);

router.post(
  "/",
  protect,
  checkAccess("order", "edit"),
  orderController.createOrder
);

router.put(
  "/:id/edit",
  protect,
  checkAccess("order", "edit"),
  orderController.updateOrder
);

router.delete(
  "/:id",
  protect,
  checkAccess("order", "edit"),
  orderController.deleteOrder
);

export default router;
