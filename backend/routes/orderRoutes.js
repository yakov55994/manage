import express from "express";
import { protect } from "../middleware/auth.js";
import orderController from "../controller/orderControllers.js";
import { checkAccess } from "../middleware/auth.js";

const router = express.Router();


router.get(
  "/",
  protect,
  orderController.getOrders
);


router.get("/:id",
  protect,
  checkAccess("order", "view"),
  orderController.getOrderById
);

router.post("/bulk",
  protect,
  checkAccess("order", "edit"),
  orderController.createBulkOrders
);

router.post("/",
  protect,
  checkAccess("order", "edit"),
  orderController.createOrder
);

router.put("/:id/edit",
  protect,
  checkAccess("order", "edit"),
  orderController.updateOrder
);

router.delete("/:id",
  protect,
  checkAccess("order", "edit"),
  orderController.deleteOrder
);


export default router;
