const { detectIssueFromImage } = require('../services/openaiVisionService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Detect civic issues from an uploaded photo using OpenAI Vision API
 * 
 * POST /api/complaints/detect-issue
 */
const detectComplaintIssue = asyncHandler(async (req, res) => {
  // 1. Verify file was uploaded
  if (!req.file) {
    throw new AppError('No photo uploaded. Please attach a valid image file (form field: "image").', 400);
  }

  // 2. Validate file type is image
  if (!req.file.mimetype.startsWith('image/')) {
    throw new AppError('Invalid file type. Only image files (JPEG, PNG, WEBP) are supported.', 400);
  }

  console.log(`📷 [AIController] Vision request received. File: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    // 3. Call OpenAI Vision Service to detect issue
    const result = await detectIssueFromImage(req.file.buffer, req.file.mimetype, req.file.originalname);

    // 4. Return formatted response
    return res.status(200).json({
      success: true,
      message: 'AI Photo Analysis completed successfully.',
      data: {
        detectedCategory: result.detectedCategory,
        confidence: result.confidence,
        reason: result.reason,
        mappedCategory: result.mappedCategory,
        mappedSubcategory: result.mappedSubcategory
      }
    });
  } catch (error) {
    console.error('❌ [AIController] Vision detection failed:', error.message);
    throw new AppError(`AI Vision analysis failed: ${error.message}`, 500);
  }
});

module.exports = {
  detectComplaintIssue
};
