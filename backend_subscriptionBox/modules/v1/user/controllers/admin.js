const admin_model = require("../models/admin_model");
const importRules = require("../../../../utilities/rules");
const middleware = require("../../../../middleware/validators");

class admin {
    
    createSubscriptionBox(req, res) {
        const boxData = middleware.decryption(req.body)
        req.body = boxData

        const rules = importRules.createSubscriptionBox
        const message = {
            required: req.language.required,
        }
        const keywords = {
            name: req.language.name,
            description: req.language.description,
            category_id: req.language.category_id,
        }

        if (middleware.checkValidationRules(req, res, boxData, rules, message, keywords)) {
            admin_model.createSubscriptionBox(req, res)
        }
    }

    updateSubscriptionBox(req, res) {
        const boxData = middleware.decryption(req.body)
        req.body = boxData

        const rules = importRules.updateSubscriptionBox
        const message = {
            required: req.language.required,
        }
        const keywords = {
            box_id: req.language.box_id,
        }

        if (middleware.checkValidationRules(req, res, boxData, rules, message, keywords)) {
            admin_model.updateSubscriptionBox(req, res)
        }
    }

    deleteSubscriptionBox(req, res) {
        const boxData = middleware.decryption(req.body)
        req.body = boxData

        const rules = importRules.deleteSubscriptionBox
        const message = {
            required: req.language.required,
        }
        const keywords = {
            box_id: req.language.box_id,
        }

        if (middleware.checkValidationRules(req, res, boxData, rules, message, keywords)) {
            admin_model.deleteSubscriptionBox(req, res)
        }
    }

    createSubscriptionPlan(req, res) {
        const planData = middleware.decryption(req.body)
        req.body = planData

        const rules = importRules.createSubscriptionPlan
        const message = {
            required: req.language.required,
        }
        const keywords = {
            box_id: req.language.box_id,
            name: req.language.name,
            price: req.language.price,
        }

        if (middleware.checkValidationRules(req, res, planData, rules, message, keywords)) {
            admin_model.createSubscriptionPlan(req, res)
        }
    }

    updateSubscriptionPlan(req, res) {
        const planData = middleware.decryption(req.body)
        req.body = planData

        const rules = importRules.updateSubscriptionPlan
        const message = {
            required: req.language.required,
        }
        const keywords = {
            plan_id: req.language.plan_id,
        }

        if (middleware.checkValidationRules(req, res, planData, rules, message, keywords)) {
            admin_model.updateSubscriptionPlan(req, res)
        }
    }

    deleteSubscriptionPlan(req, res) {
        const planData = middleware.decryption(req.body)
        req.body = planData

        const rules = importRules.deleteSubscriptionPlan
        const message = {
            required: req.language.required,
        }
        const keywords = {
            plan_id: req.language.plan_id,
        }

        if (middleware.checkValidationRules(req, res, planData, rules, message, keywords)) {
            admin_model.deleteSubscriptionPlan(req, res)
        }
    }

    getProductsByPlan(req, res) {
        const productData = middleware.decryption(req.body)
        req.body = productData

        const rules = importRules.getProductsByPlan
        const message = {
            required: req.language.required,
        }
        const keywords = {
            plan_id: req.language.plan_id,
        }

        if (middleware.checkValidationRules(req, res, productData, rules, message, keywords)) {
            admin_model.getProductsByPlan(req, res)
        }
    }

    // Add product to plan
    addProductToPlan(req, res) {
        const productData = middleware.decryption(req.body)
        req.body = productData

        const rules = importRules.addProductToPlan
        const message = {
            required: req.language.required,
        }
        const keywords = {
            plan_id: req.language.plan_id,
            type: req.language.type,
            name: req.language.name,
            description: req.language.description,
        }

        if (middleware.checkValidationRules(req, res, productData, rules, message, keywords)) {
            admin_model.addProductToPlan(req, res)
        }
    }

    // Update product
    updateProduct(req, res) {
        const productData = middleware.decryption(req.body)
        req.body = productData

        const rules = importRules.updateProduct
        const message = {
            required: req.language.required,
        }
        const keywords = {
            product_id: req.language.product_id,
        }

        if (middleware.checkValidationRules(req, res, productData, rules, message, keywords)) {
            admin_model.updateProduct(req, res)
        }
    }

    // Delete product
    deleteProduct(req, res) {
        const productData = middleware.decryption(req.body)
        req.body = productData

        const rules = importRules.deleteProduct
        const message = {
            required: req.language.required,
        }
        const keywords = {
            product_id: req.language.product_id,
        }

        if (middleware.checkValidationRules(req, res, productData, rules, message, keywords)) {
            admin_model.deleteProduct(req, res)
        }
    }

    getAllOrders(req, res) {
        admin_model.getAllOrders(req, res)
    }

    updateOrderStatus(req, res) {
        const orderData = middleware.decryption(req.body)
        req.body = orderData

        const rules = importRules.updateOrderStatus
        const message = {
            required: req.language.required,
        }
        const keywords = {
            order_id: req.language.order_id,
            order_status: req.language.order_status,
        }

        if (middleware.checkValidationRules(req, res, orderData, rules, message, keywords)) {
            admin_model.updateOrderStatus(req, res)
        }
    }

    getSubscriptionAnalytics(req, res) {
        admin_model.getSubscriptionAnalytics(req, res)
    }
}

module.exports = new admin();
