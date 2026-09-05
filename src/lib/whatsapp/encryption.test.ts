import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, isLegacyFormat } from "./encryption";

const KEY_HEX = process.env.ENCRYPTION_KEY!;

function cbcEncryptLegacy(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(KEY_HEX, "hex"),
    iv,
  );
  let ct = cipher.update(plaintext, "utf8", "hex");
  ct += cipher.final("hex");
  return `${iv.toString("hex")}:${ct}`;
}

describe("encryption", () => {
  describe("encrypt / decrypt round-trip", () => {
    it("recovers the original plaintext", () => {
      const ct = encrypt("EAAG... fake WhatsApp token");
      expect(decrypt(ct)).toBe("EAAG... fake WhatsApp token");
    });

    it("produces three colon-separated parts (GCM)", () => {
      const ct = encrypt("anything");
      expect(ct.split(":")).toHaveLength(3);
    });

    it("uses a fresh IV per encrypt so identical plaintexts produce different ciphertexts", () => {
      const a = encrypt("same input");
      const b = encrypt("same input");
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe("same input");
      expect(decrypt(b)).toBe("same input");
    });

    it("roundtrips empty string", () => {
      const ct = encrypt("");
      expect(decrypt(ct)).toBe("");
    });

    it("roundtrips multibyte UTF-8", () => {
      const ct = encrypt("token-✓-🔐-žąsis");
      expect(decrypt(ct)).toBe("token-✓-🔐-žąsis");
    });
  });

  describe("GCM authentication", () => {
    it("rejects ciphertext tampered after encryption", () => {
      const ct = encrypt("secret");
      const [ivHex, ctHex, tagHex] = ct.split(":");
      // Flip a byte in the ciphertext body — auth tag will mismatch.
      const tamperedCtHex =
        (parseInt(ctHex.slice(0, 2), 16) ^ 0xff).toString(16).padStart(2, "0") +
        ctHex.slice(2);
      expect(() =>
        decrypt(`${ivHex}:${tamperedCtHex}:${tagHex}`),
      ).toThrow();
    });

    it("rejects a swapped auth tag", () => {
      const ct = encrypt("secret");
      const [ivHex, ctHex] = ct.split(":");
      const bogusTag = "00".repeat(16);
      expect(() => decrypt(`${ivHex}:${ctHex}:${bogusTag}`)).toThrow();
    });

    it("rejects a GCM IV of the wrong length", () => {
      const ct = encrypt("secret");
      const [, ctHex, tagHex] = ct.split(":");
      const shortIv = "00".repeat(8); // 8 bytes ≠ 12
      expect(() => decrypt(`${shortIv}:${ctHex}:${tagHex}`)).toThrow(
        /GCM IV length/,
      );
    });

    it("rejects a GCM auth tag of the wrong length", () => {
      const ct = encrypt("secret");
      const [ivHex, ctHex] = ct.split(":");
      const shortTag = "00".repeat(8); // 8 bytes ≠ 16
      expect(() => decrypt(`${ivHex}:${ctHex}:${shortTag}`)).toThrow(
        /auth-tag length/,
      );
    });
  });

  describe("legacy CBC compatibility (read-only)", () => {
    it("decrypts a CBC blob produced by the previous codepath", () => {
      const legacy = cbcEncryptLegacy("old-token");
      expect(decrypt(legacy)).toBe("old-token");
    });

    it("rejects a CBC blob with the wrong IV length", () => {
      // 8-byte IV (16 hex chars) instead of 16 bytes.
      const bogus = "00".repeat(8) + ":" + "00".repeat(16);
      expect(() => decrypt(bogus)).toThrow(/CBC IV length/);
    });
  });

  describe("format detection", () => {
    it("isLegacyFormat returns true for two-part CBC strings", () => {
      const legacy = cbcEncryptLegacy("anything");
      expect(isLegacyFormat(legacy)).toBe(true);
    });

    it("isLegacyFormat returns false for three-part GCM strings", () => {
      const modern = encrypt("anything");
      expect(isLegacyFormat(modern)).toBe(false);
    });
  });

  describe("key formats", () => {
    it("supports 32-byte base64 keys and roundtrips with hex key equivalent", () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      const base64Key = "suH+IM5wdJfyu1j6dxNSwB/Mb7cQFz21pnS06h88dCM=";
      const hexKey = Buffer.from(base64Key, "base64").toString("hex");

      try {
        process.env.ENCRYPTION_KEY = base64Key;
        const ciphertext = encrypt("secret-token-123");

        // Decrypt with base64 key
        expect(decrypt(ciphertext)).toBe("secret-token-123");

        // Decrypt with hex equivalent key
        process.env.ENCRYPTION_KEY = hexKey;
        expect(decrypt(ciphertext)).toBe("secret-token-123");
      } finally {
        process.env.ENCRYPTION_KEY = originalKey;
      }
    });

    it("throws a helpful error if ENCRYPTION_KEY is invalid length", () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      try {
        process.env.ENCRYPTION_KEY = "too-short";
        expect(() => encrypt("secret")).toThrow(/ENCRYPTION_KEY must be a valid 32-byte key/);
      } finally {
        process.env.ENCRYPTION_KEY = originalKey;
      }
    });
  });
});
