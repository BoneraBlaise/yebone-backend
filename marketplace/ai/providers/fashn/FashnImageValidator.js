const MAX_BASE64_LENGTH = 12 * 1024 * 1024;

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function isBase64Image(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.startsWith("data:image/")) return true;
  return /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 200)) && trimmed.length > 100;
}

function normalizeBase64Image(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (isBase64Image(trimmed)) return `data:image/jpeg;base64,${trimmed}`;
  return null;
}

function validateTryOnImages({ personImage, garmentImage } = {}) {
  const person = personImage ? String(personImage).trim() : "";
  const garment = garmentImage ? String(garmentImage).trim() : "";

  if (!person) {
    return { ok: false, code: "PERSON_IMAGE_REQUIRED", message: "A person photo is required for YEBO AI try-on." };
  }
  if (!garment) {
    return { ok: false, code: "GARMENT_IMAGE_REQUIRED", message: "A product image is required for YEBO AI try-on." };
  }

  const personValid = isHttpUrl(person) || isBase64Image(person);
  const garmentValid = isHttpUrl(garment) || isBase64Image(garment);

  if (!personValid) {
    return { ok: false, code: "INVALID_PERSON_IMAGE", message: "Person photo must be a valid image URL or upload." };
  }
  if (!garmentValid) {
    return { ok: false, code: "INVALID_GARMENT_IMAGE", message: "Product image must be a valid image URL." };
  }

  if (person.length > MAX_BASE64_LENGTH || garment.length > MAX_BASE64_LENGTH) {
    return { ok: false, code: "IMAGE_TOO_LARGE", message: "Uploaded image is too large for YEBO AI try-on." };
  }

  return {
    ok: true,
    personImage: isHttpUrl(person) ? person : normalizeBase64Image(person),
    garmentImage: isHttpUrl(garment) ? garment : normalizeBase64Image(garment),
  };
}

module.exports = {
  isHttpUrl,
  isBase64Image,
  normalizeBase64Image,
  validateTryOnImages,
};
