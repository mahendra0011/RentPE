import { v2 as cloudinary } from "cloudinary";

let configured = false;

function getCloudinarySettings() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };
}

function configureCloudinary() {
  const settings = getCloudinarySettings();
  const ready = Boolean(settings.cloud_name && settings.api_key && settings.api_secret);

  if (!ready) return false;

  if (!configured) {
    cloudinary.config(settings);
    configured = true;
  }

  return true;
}

function getMissingConfigError() {
  const error = new Error(
    "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.",
  );
  error.status = 503;
  return error;
}

export function isCloudinaryReady() {
  return configureCloudinary();
}

export function uploadBuffer(file) {
  if (!file?.buffer) {
    return Promise.resolve(null);
  }

  if (!configureCloudinary()) {
    return Promise.reject(getMissingConfigError());
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || "rentpe/rooms",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
}
