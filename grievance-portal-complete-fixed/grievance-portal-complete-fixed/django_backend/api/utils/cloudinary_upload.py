import os
import cloudinary
import cloudinary.uploader

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'your_cloud_name'),
    api_key=os.getenv('CLOUDINARY_API_KEY', 'your_api_key'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', 'your_api_secret')
)

def upload_file_to_cloudinary(file_obj, folder=None, resource_type="auto"):
    # If Cloudinary is not configured or in fallback dummy dev mode
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
    if not cloud_name or cloud_name == 'your_cloud_name':
        # Fallback fake URL
        filename = getattr(file_obj, 'name', 'dummy_file')
        print(f"☁️ Cloudinary not configured. Simulating upload of {filename}")
        return {
            'secure_url': f"https://res.cloudinary.com/dummy/image/upload/v12345/{filename}",
            'public_id': f"dummy_{filename}"
        }

    try:
        res = cloudinary.uploader.upload(
            file_obj,
            folder=folder,
            resource_type=resource_type
        )
        return res
    except Exception as e:
        print(f"❌ Cloudinary upload error: {str(e)}")
        # Graceful fallback in development to not block executions
        filename = getattr(file_obj, 'name', 'dummy_file')
        return {
            'secure_url': f"https://res.cloudinary.com/dummy/image/upload/v12345/{filename}",
            'public_id': f"dummy_{filename}",
            'error': str(e)
        }
