const cron = require('node-cron');
const cronModel = require('../jobs/cron.job');

// 1 min Cron
cron.schedule('* * * * *', function () {
    cronModel.scheduled_order_process();
    cronModel.check_notification();
});

// 2 min Cron
cron.schedule('*/2 * * * *', function () {
    // cronModel.mark_prepared();
    // cronModel.assign_delivery_rider();
});

// 5 min Cron
cron.schedule('*/5 * * * *', function () {
    cronModel.loyalty_points_release();
    // cronModel.mark_packaged();
    // cronModel.mark_as_completed();
});

// 1 day Cron
cron.schedule('0 0 * * *', function () {
    cronModel.user_inactive_check();
});