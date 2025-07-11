const { SELECT, INSERT, UPDATE, DELETE } = require('../../utils/SQLWorker');
const { sendResponse } = require('../../middleware');
const common = require('../../utils/common');
const {
    CATEGORY_IMAGE_PATH
} = require('../../config/constants');

let category_model = {

    add_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { name, available_all_day, time_from, time_upto, images, is_drink, is_dessert } = req.body;

            let saved_image_ids = await common.save_multiple_images(images);

            let insert_category = {
                name: name,
                available_all_day: available_all_day,
                time_from: time_from,
                time_upto: time_upto,
                image_ids: saved_image_ids.toString(),
                is_drink: is_drink,
                is_dessert: is_dessert,
                created_by: admin_id
            };

            if (available_all_day == 1) {
                insert_category.time_from = null;
                insert_category.time_upto = null;
            }

            let category_id = await INSERT(`INSERT INTO tbl_categories SET ?`, insert_category).catch((err) => {
                DELETE(`DELETE FROM tbl_media_files WHERE id IN (${saved_image_ids})`).catch((err) => { });
            });

            if (!category_id) {
                throw new Error("failed");
            }

            return sendResponse(req, res, 200, 1, { keyword: "added", components: {} });

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: 'failed_to_add', components: {} });
        }
    },

    edit_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { category_id, name, available_all_day, time_from, time_upto, images, is_drink, is_dessert } = req.body;

            // Fetch the current category data
            let existing_category = await SELECT.One(`SELECT image_ids FROM tbl_categories WHERE id = ${category_id}`, true, {
                no_data_msg: 'category_not_found',
                failed_msg: 'failed_to_fetch_category'
            });

            // Save new images if uploaded
            let image_file_ids = [];
            if (images && images.length > 0) {
                // Save new images to the database
                image_file_ids = await common.save_multiple_images(images);

                // Optional: delete old images if they are being replaced
                if (existing_category.image_ids) {
                    await DELETE(`DELETE FROM tbl_media_files WHERE id IN (${existing_category.image_ids.split(',')})`);
                }
            }

            // Prepare the data for updating the category
            let update_category = {
                name: name,
                available_all_day: available_all_day,
                time_from: available_all_day == 1 ? null : time_from,
                time_upto: available_all_day == 1 ? null : time_upto,
                image_ids: image_file_ids.length > 0 ? image_file_ids.toString() : existing_category.image_ids,
                is_drink: is_drink,
                is_dessert: is_dessert,
                updated_by: admin_id
            };

            // Update the category in the database
            await UPDATE(`UPDATE tbl_categories SET ? WHERE id = ?`, [update_category, category_id]);

            return sendResponse(req, res, 200, 1, { keyword: "edited_details", components: {} });

        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: "failed_to_edit_details", components: {} });
        }
    },

    list_categories: async (req, res) => {
        try {
            let categories = await SELECT.All(`SELECT id as category_id, name, available_all_day, time_from, time_upto, (select count(id) from tbl_sub_categories where category_id = tbl_categories.id AND tbl_sub_categories.is_delete = 0) as sub_category_count, is_drink, is_dessert, image_ids, is_active, created_at FROM tbl_categories WHERE is_delete = 0 order by sequence asc`);

            let images_ids = categories.map(category => category.image_ids).join(',').split(',');

            let images = await SELECT.All(`SELECT id as image_id, concat('${CATEGORY_IMAGE_PATH}', name) as name FROM tbl_media_files WHERE id IN (${images_ids})`);

            categories = categories.map(category => {
                category.images = images.filter(image => category.image_ids.split(',').includes(image.image_id.toString()));
                return category;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, categories);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch", components: {} });
        }
    },

    get_category: async (req, res) => {
        try {
            let { category_id } = req.body;

            let category = await SELECT.One(`SELECT id as category_id, name, available_all_day, time_from, time_upto, image_ids, is_drink, is_dessert, is_active, created_at FROM tbl_categories WHERE id = ${category_id} AND is_delete = 0`, true, {
                no_data_msg: 'category_not_found',
                failed_msg: 'failed_to_fetch_category'
            });

            let images = await SELECT.All(`SELECT id as image_id, concat('${CATEGORY_IMAGE_PATH}', name) as name FROM tbl_media_files WHERE id IN (${category.image_ids.split(',')})`, false);

            category.images = images;

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, category);

        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: e.message || "failed_to_fetch", components: {} });
        }
    },

    action_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { category_id, is_active } = req.body;

            await UPDATE(`UPDATE tbl_categories SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${category_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });
        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: "failed_to_update_status", components: {} });
        }
    },

    delete_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { category_id } = req.body;

            await UPDATE(`UPDATE tbl_categories SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${category_id})`);

            await UPDATE(`UPDATE tbl_sub_categories SET is_delete = 1, updated_by = ${admin_id} WHERE category_id in (${category_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: "failed_to_delete", components: {} });
        }
    },

    // sub category
    add_sub_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { category_id, name, images } = req.body;

            await SELECT.One(`SELECT id FROM tbl_categories WHERE id = ${category_id} AND is_delete = 0`, true, {
                no_data_msg: 'category_not_found',
                failed_msg: 'failed_to_fetch_category'
            });

            let saved_image_ids = await common.save_multiple_images(images);

            let insert_sub_category = {
                category_id: category_id,
                name: name,
                image_ids: saved_image_ids.toString(),
                created_by: admin_id
            };

            let sub_category_id = await INSERT(`INSERT INTO tbl_sub_categories SET ?`, insert_sub_category).catch((err) => {
                DELETE(`DELETE FROM tbl_media_files WHERE id IN (${saved_image_ids})`);
            });

            if (!sub_category_id) {
                throw new Error("failed");
            }

            return sendResponse(req, res, 200, 1, { keyword: "added", components: {} });
        }
        catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: e.message || "failed_to_add", components: {} });
        }
    },

    edit_sub_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { category_id, sub_category_id, name, images } = req.body;

            let existing_sub_category = await SELECT.One(`SELECT image_ids FROM tbl_sub_categories WHERE id = ${sub_category_id}`, true, {
                no_data_msg: 'sub_category_not_found',
                failed_msg: 'failed_to_fetch_sub_category'
            });

            if (existing_sub_category.category_id != category_id) {
                await SELECT.One(`SELECT id FROM tbl_categories WHERE id = ${category_id} AND is_delete = 0`, true, {
                    no_data_msg: 'category_not_found',
                    failed_msg: 'failed_to_fetch_category'
                });
            }

            let image_file_ids = [];
            if (images && images.length > 0) {
                image_file_ids = await common.save_multiple_images(images);

                if (existing_sub_category.image_ids) {
                    await DELETE(`DELETE FROM tbl_media_files WHERE id IN (${existing_sub_category.image_ids.split(',')})`);
                }
            }

            let update_sub_category = {
                category_id: category_id,
                name: name,
                image_ids: image_file_ids.length > 0 ? image_file_ids.toString() : existing_sub_category.image_ids,
                updated_by: admin_id
            };

            await UPDATE(`UPDATE tbl_sub_categories SET ? WHERE id = ?`, [update_sub_category, sub_category_id]);

            return sendResponse(req, res, 200, 1, { keyword: "edited", components: {} });

        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: e.message || "failed_to_edit", components: {} });
        }
    },

    list_sub_categories: async (req, res) => {
        try {

            let { category_id } = req.body;

            let where = category_id ? `sc.category_id = ${category_id} AND` : '';

            let sub_categories = await SELECT.All(`SELECT sc.id as sub_category_id, sc.category_id, sc.name as sub_category_name, c.name as category_name, sc.image_ids, if(sc.updated_by is null, tau2.name, tau.name) as updated_admin_name, if(sc.updated_by is null, tau2.user_type, tau.user_type) as updated_admin_type, sc.is_active, sc.created_at, sc.updated_at FROM tbl_sub_categories sc JOIN tbl_categories c ON sc.category_id = c.id LEFT JOIN tbl_admin_users tau2 on sc.created_by = tau2.id LEFT JOIN tbl_admin_users tau on sc.updated_by = tau.id WHERE ${where} sc.is_delete = 0 AND c.is_delete = 0 order by sc.sequence asc`);

            let images_ids = sub_categories.map(sub_category => sub_category.image_ids).join(',').split(',');

            let images = await SELECT.All(`SELECT id as image_id, concat('${CATEGORY_IMAGE_PATH}', name) as name FROM tbl_media_files WHERE id IN (${images_ids})`);

            sub_categories = sub_categories.map(sub_category => {
                sub_category.images = images.filter(image => sub_category.image_ids.split(',').includes(image.image_id.toString()));
                return sub_category;
            });

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, sub_categories);

        } catch (e) {
            return sendResponse(req, res, 200, 0, { keyword: e.message || "failed_to_fetch", components: {} });
        }
    },

    get_sub_category: async (req, res) => {
        try {
            let { sub_category_id } = req.body;

            let sub_category = await SELECT.One(`SELECT sc.id as sub_category_id, sc.category_id, sc.name as sub_category_name, c.name as category_name, sc.image_ids, sc.is_active, sc.created_at FROM tbl_sub_categories sc JOIN tbl_categories c ON sc.category_id = c.id WHERE sc.id = ${sub_category_id} AND sc.is_delete = 0 AND c.is_delete = 0`, true, {
                no_data_msg: 'sub_category_not_found',
                failed_msg: 'failed_to_fetch_sub_category'
            });

            let images = await SELECT.All(`SELECT id as image_id, concat('${CATEGORY_IMAGE_PATH}', name) as name FROM tbl_media_files WHERE id IN (${sub_category.image_ids.split(',')})`, false);

            sub_category.images = images;

            return sendResponse(req, res, 200, 1, { keyword: "success", components: {} }, sub_category);

        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: e.message || "failed_to_fetch", components: {} });
        }
    },

    action_sub_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { sub_category_id, is_active } = req.body;

            await UPDATE(`UPDATE tbl_sub_categories SET is_active = ${is_active}, updated_by = ${admin_id} WHERE id in (${sub_category_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "status_updated", components: {} });

        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: "failed_to_update_status", components: {} });
        }
    },

    delete_sub_category: async (req, res) => {
        try {
            let { admin_id } = req.loginUser;
            let { sub_category_id } = req.body;

            await UPDATE(`UPDATE tbl_sub_categories SET is_delete = 1, updated_by = ${admin_id} WHERE id in (${sub_category_id})`);

            return sendResponse(req, res, 200, 1, { keyword: "deleted", components: {} });
        } catch (e) {
            return sendResponse(req, res, 400, 0, { keyword: "failed_to_delete", components: {} });
        }
    }
};

module.exports = category_model;