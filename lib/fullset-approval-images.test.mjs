import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_DOCUMENT,
  checkImageSelection,
  detectImageType,
} from "./fullset-approval-input.ts";

const bytes = (...values) => {
  const out = new Uint8Array(32);
  out.set(values);
  return out;
};
const ascii = (text) => {
  const out = new Uint8Array(Math.max(text.length, 32));
  out.set([...text].map((c) => c.charCodeAt(0)));
  return out;
};

test("reconoce PNG, JPEG y WebP por su firma", () => {
  assert.equal(
    detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    "image/png",
  );
  assert.equal(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");

  const webp = ascii("RIFF$\u0000\u0000\u0000WEBP");
  assert.equal(detectImageType(webp), "image/webp");
});

test("rechaza SVG, HTML renombrado, GIF y archivos demasiado cortos", () => {
  assert.equal(detectImageType(ascii("<svg xmlns='http://www.w3.org/2000/svg'>")), null);
  assert.equal(detectImageType(ascii("<html><script>alert(1)</script>")), null);
  assert.equal(detectImageType(ascii("GIF89a")), null);
  assert.equal(detectImageType(new Uint8Array([0xff, 0xd8])), null);
});

test("la selección acepta hasta 3 imágenes válidas por documento", () => {
  const png = { size: 1000, type: "image/png" };

  assert.equal(checkImageSelection([png, png, png]), null);
  assert.equal(
    checkImageSelection(Array(MAX_IMAGES_PER_DOCUMENT + 1).fill(png)),
    "TOO_MANY_PER_DOCUMENT",
  );
});

test("la selección rechaza archivos grandes, vacíos o que no son imágenes", () => {
  assert.equal(
    checkImageSelection([{ size: MAX_IMAGE_BYTES + 1, type: "image/png" }]),
    "TOO_BIG",
  );
  assert.equal(checkImageSelection([{ size: 0, type: "image/png" }]), "EMPTY");
  assert.equal(
    checkImageSelection([{ size: 10, type: "image/svg+xml" }]),
    "NOT_AN_IMAGE",
  );
  assert.equal(
    checkImageSelection([{ size: 10, type: "application/pdf" }]),
    "NOT_AN_IMAGE",
  );
});
