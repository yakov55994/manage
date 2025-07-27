import express from 'express';
import invoiceControllers from '../controller/invoiceControllers.js';

const router = express.Router();

router.get('/search', invoiceControllers.search);

router.get('/check-duplicate', invoiceControllers.check_duplicate)

router.post('/', invoiceControllers.createInvoices);

router.get('/', invoiceControllers.getAllInvoices);

router.get('/:id', invoiceControllers.getInvoiceById);

router.put('/:id', invoiceControllers.updateInvoice);

router.put("/:id/status", invoiceControllers.updateInvoicePaymentStatus);

router.delete('/upload/cloudinary', invoiceControllers.deleteFile);

router.delete('/:id', invoiceControllers.deleteInvoice);


export default router;