const user_model = require("../models/user_model");
const common = require("../../../../utilities/common");
const middleware = require("../../../../middleware/validators");
const { t } = require('localizify');

class UserController {
  login(req, res) {
    const userData = req.body;
    console.log(userData);
    if (userData.login_type == 's') {
      var rules = {
        email_phone: 'required',
        password: 'required',
      };
      var message = {
        required: req.language.required,
      };
      console.log("message", message);
      var keywords = {
        'password': t('rest_keywords_password'),
      };
    } else {
      var rules = {
        email_phone: 'required',
        social_id: 'required',
      };
      var message = {
        required: req.language.required,
      };
      console.log("message", message);
      var keywords = {};
    }
    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.login(req, userData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  signup(req, res) {
    const userData = req.body;
    if (userData.login_type == 's') {
      var rules = {
        username: 'required',
        password: 'required',
        phone: 'required',
        email: 'required',
      };
      var message = {
        required: req.language.required,
      };
      console.log("message", message);
      var keywords = {
        'password': t('rest_keywords_password'),
      };
    } else {
      var rules = {
        username: 'required',
        phone: 'required',
        email: 'required',
      };
      var message = {
        required: req.language.required,
      };
      console.log("message", message);
      var keywords = {};
    }
    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.signup(req, userData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  verifyOTP(req, res) {
    const userId = req.params;
    const otpData = req.body;
    const rules = {
      otp: 'required',
      action: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'otp': t('rest_keywords_otp'),
    };
    if (middleware.checkValidationRules(req, res, otpData, rules, message, keywords)) {
      user_model.verifyOTP(req, userId, otpData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  editProfile(req, res) {
    const userId = req.params;
    const profileData = req.body;
    const rules = {
      fullname: 'required',
      dob: 'required',
      gender: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      'name': t('rest_keywords_name'),
    };
    if (middleware.checkValidationRules(req, res, profileData, rules, message, keywords)) {
      user_model.editProfile(req, userId, profileData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  forgotPassword(req, res) {
    const userData = req.body;
    const rules = {
      email_phone: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'email_phone': t('rest_keywords_email_phone'),
    };
    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.forgotPassword(req, userData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  updatePassword(req, res) {
    const userId = req.params;
    const passwordData = req.body;
    const rules = {
      new_password: 'required',
      otp: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'new_password': t('rest_keywords_new_password'),
    };
    if (middleware.checkValidationRules(req, res, passwordData, rules, message, keywords)) {
      user_model.updatePassword(req, userId, passwordData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  changePassword(req, res) {
    const user_id = req.params;
    const userData = req.body;
    const rules = {
      old_password: 'required',
      new_password: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'old_password': t('rest_keywords_old_password'),
      // 'new_password': t('rest_keywords_new_password'),
    };
    if (middleware.checkValidationRules(req, res, userData, rules, message, keywords)) {
      user_model.changePassword(req, user_id, userData, (err, msg) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, msg);
      });
    }
  }

  logout(req, res) {
    const user_id = req.params;
    user_model.logout(req, user_id, (err, msg) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, msg);
    });
  }

  deleteUser(req, res) {
    const userId = req.params.user_id;
    user_model.deleteUser(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getTrendingPosts(req, res) {
    user_model.getTrendingPosts(req, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getNewPosts(req, res) {
    const filters = req.query;
    console.log(filters);
    user_model.getNewPosts(req, filters, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getFollowingPosts(req, res) {
    const userId = req.params.user_id;
    const filters = req.query;
    user_model.getFollowingPosts(req, userId, filters, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getExpiringPosts(req, res) {
    user_model.getExpiringPosts(req, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getCategories(req, res) {
    user_model.getCategories(req, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  addPost(req, res) {
    const userId = req.params.user_id;
    const postData = req.body;
    const rules = {
      description: 'required',
      image: 'required',
      cat_id: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'content': t('rest_keywords_content'),
    };
    if (middleware.checkValidationRules(req, res, postData, rules, message, keywords)) {
      user_model.addPost(req, userId, postData, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  getAllPost(req, res) {
    const userId = req.params.user_id;
    user_model.getAllPosts(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  deletePost(req, res) {
    const postId = req.params.post_id;
    user_model.deletePost(req, postId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  addComment(req, res) {
    const postId = req.params.post_id;
    const { user_id, comment } = req.body;
    const rules = {
      comment: 'required',
      user_id: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'comment': t('rest_keywords_comment'),
    };
    if (middleware.checkValidationRules(req, res, { comment }, rules, message, keywords)) {
      user_model.addComment(req, user_id, postId, comment, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  addUpdateRate(req, res) {
    const postId = req.params.post_id;
    const { user_id, rating } = req.body;
    const rules = {
      rating: 'required',
      user_id: 'required',
    };
    const message = {
      required: req.language.required,
    };
    const keywords = {
      // 'rating': t('rest_keywords_rating'),
    };
    if (middleware.checkValidationRules(req, res, { rating }, rules, message, keywords)) {
      user_model.addUpdateRate(req, user_id, postId, rating, (err, result) => {
        if (err) {
          return common.response(res, err);
        }
        return common.response(res, result);
      });
    }
  }

  getImageRanking(req, res) {
    const postId = req.params.post_id;
    user_model.getImageRanking(req, postId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getSavedPost(req, res) {
    const userId = req.params.user_id;
    user_model.getSavedPost(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getFollowing(req, res) {
    const userId = req.params.user_id;
    user_model.getFollowing(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getFollower(req, res) {
    const userId = req.params.user_id;
    user_model.getFollower(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getUserDetails(req, res) {
    const userId = req.params.user_id;
    user_model.getUserDetails(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getOtherUserDetails(req, res) {
    const otherUser_id = req.params.otherUser_id;
    const userId = req.body.user_id;
    user_model.getOtherUserDetails(req, userId, otherUser_id, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }

  getNotifications(req, res) {
    const userId = req.params.user_id;
    user_model.getNotifications(req, userId, (err, result) => {
      if (err) {
        return common.response(res, err);
      }
      return common.response(res, result);
    });
  }
}

module.exports = new UserController();