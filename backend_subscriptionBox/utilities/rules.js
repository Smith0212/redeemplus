const rules = {

    login_simple: {
        email: "required|string",
        password: "required|string",
    },
    login_social: {
        login_type: "required|string|in:a,g,f",
        email_phone: "required|string|email",
        social_id: "required|string",
        address: "required|string",
        latitude: "required|numeric",
        longitude: "required|numeric",
        device_token: "required|string",
        device_type: "required|string",
        device_name: "required|string",
        os_version: "required|string"
    },
    signup_simple: {
        login_type: "required|string|in:s",
        first_name: "required|string",
        last_name: "required|string",
        password: "required|string|min:3",
        phone: "required|numeric",
        email: "required|email",
        country_code: "required|string",
        address: "required|string",
        latitude: "required|numeric",
        longitude: "required|numeric",
        device_token: "required|string",
        device_type: "required|string",
        device_name: "required|string",
        os_version: "required|string",
    },
    signup_social: {
        login_type: "required|string|in:g,f,a",
        email: "required|email",
        phone: "required|numeric",
        social_id: "required|string",
        country_code: "required|string",
        address: "required|string",
        latitude: "required|numeric",
        longitude: "required|numeric",
        device_token: "required|string",
        device_type: "required|string",
        device_name: "required|string",
        os_version: "required|string",
    },
    verifyOtp: {
        otp: "required|digits:4",
    },
    editProfile: {
        username: "nullable|string",
        first_name: "nullable|string",
        last_name: "nullable|string",
        profile_image: "nullable|string"
    },  
    updatePassword: {
        otp: "required|digits:4",
        new_password: "required|string|min:3"
    },  
    changePassword: {
        old_password: "required|string|min:3",
        new_password: "required|string|min:3"
    },  
    forgetPassword: {
        email_phone: "required"
    }, 
    addAddressRules: {
        type: 'required|in:home,office',
        house_no: 'required|string',
        society_name: 'required|string',
        latitude: 'required|string',
        longitude: 'required|string'
    }
};

module.exports = rules;