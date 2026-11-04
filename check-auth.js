import "dotenv/config";
import { betterAuth } from "better-auth";
import { jwt, bearer } from "better-auth/plugins";

const auth = betterAuth({
  baseURL: "http://localhost:5000",
  secret: "univora_default_secret_key_change_in_production_12345",
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    },
  },
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
      },
    }),
    bearer(),
  ],
});

console.log("Registered routes in auth:", Object.keys(auth.api));

try {
  const res = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: "http://localhost:3000/",
    },
  });
  console.log("signInSocial result:", res);
} catch (e) {
  console.error("signInSocial error:", e);
}
