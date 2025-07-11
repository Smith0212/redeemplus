const axios = require('axios');

// <<<<<<<<<<<<<<< function for send mobile Message FOR KENYA >>>>>>>>>>>>>>>
const sendKenyaSMS = async ({ country_code, phone, message, type = 'sendsms' }) => {
    try {
        const baseUrl = 'https://quicksms.advantasms.com'
        const apikey = process.env.ADVANTA_SMS_API_KEY
        const partnerID = process.env.ADVANTA_SMS_PARTNER_ID
        const shortcode = process.env.ADVANTA_SMS_SENDER_ID

        let mobile = country_code?.replace(/[+\s]/g, '') + phone?.replace(/\s/g, '');

        // Validate required parameters
        if (!apikey || !partnerID || !mobile || !message || !shortcode) {
            throw new Error('Missing required parameters: apikey, partnerID, mobile, message, and shortcode are required');
        }

        const response = await axios({
            method: 'POST',
            url: `${baseUrl}/api/services/${type}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: { apikey, partnerID, mobile, message, shortcode }
        });

        return {
            status: response.data?.responses?.[0]?.['response-code'] === 200 ? true : false,
            message: response.data?.responses?.[0]?.['response-description']
        };
    } catch (error) {
        return {
            status: false,
            message: error?.response?.data?.responses?.[0]?.['response-description'] || 'An error occurred while sending the SMS'
        };
    }
}

// <<<<<<<<<<<<<<< function for send mobile Message FOR UGANDA >>>>>>>>>>>>>>>
const sendUgandaSMS = async ({ mobile, message, type = 'sendsms' }) => {
    return {
        status: false,
        message: 'Not implemented yet'
    }
}

// <<<<<<<<<<<<<<< function for send message on whatsapp >>>>>>>>>>>>>>>
const sendWhatsAppMessage = async ({ mobile, message }) => {
    return {
        status: false,
        message: 'Not implemented yet'
    }
}

module.exports = {
    sendKenyaSMS,
    sendUgandaSMS,
    sendWhatsAppMessage
};