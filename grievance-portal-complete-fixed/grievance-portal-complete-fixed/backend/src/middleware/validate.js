const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ 
        field: e.path || e.param, 
        message: e.msg 
      })),
    });
  }
  next();
};

// Auth Validators
const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must contain: uppercase letter, lowercase letter, and number'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value && value.trim() !== '') {
        if (!/^[6-9]\d{9}$/.test(value)) {
          throw new Error('Valid 10-digit Indian mobile number required (starting with 6-9)');
        }
      }
      return true;
    }),
  
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid state'),
  
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid district'),
  
  validate, // This runs AFTER all validators and returns formatted errors
];

const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

// Complaint Validators
const complaintValidator = [
  body('category')
    .isIn(['crime', 'corruption', 'civic_issue', 'fire', 'hospital'])
    .withMessage('Category must be crime, corruption, civic_issue, fire, or hospital'),
  body('subcategory')
    .trim()
    .notEmpty()
    .withMessage('Subcategory is required'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20-5000 characters'),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .custom((value) => {
      try {
        const loc = typeof value === 'string' ? JSON.parse(value) : value;
        if (!loc.address || !loc.state || !loc.district) {
          throw new Error('Location must have address, state, and district');
        }
        return true;
      } catch (e) {
        throw new Error('Invalid location format');
      }
    }),
  body('isAnonymous')
    .optional()
    .isBoolean(),
  validate,
];

const statusUpdateValidator = [
  param('id')
    .notEmpty()
    .withMessage('Complaint ID required'),
  body('status')
    .isIn(['pending', 'under_review', 'investigating', 'action_taken', 'closed', 'rejected'])
    .withMessage('Invalid status'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  complaintValidator,
  statusUpdateValidator,
};
