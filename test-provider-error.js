import { betterAuth } from "better-auth";

const authWithoutGoogle = betterAuth({
  baseURL: "http://localhost:5000",
  secret: "univora_default_secret_key_change_in_production_12345",
  socialProviders: {},
});

try {
  await authWithoutGoogle.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: "http://localhost:3000/",
    },
  });
} catch (e) {
  console.log("Error without google:", e.body || e.message || e);
}
