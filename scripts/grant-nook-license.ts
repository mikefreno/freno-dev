import { nookSchemaBootstrap, grantLicense } from "~/server/nook";

// Mint a free The Nook license (gifting / comps). Defaults to 1 device.
//
//   bun --env-file=.env scripts/grant-nook-license.ts \
//     --email friend@example.com [--devices 1]

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const email = arg("email");
const devices = Number(arg("devices") ?? "1");

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(
    "Usage: bun --env-file=.env scripts/grant-nook-license.ts --email you@example.com [--devices 1]"
  );
  process.exit(1);
}

await nookSchemaBootstrap;
const { key } = await grantLicense(email, devices);

console.log(`Granted The Nook license for ${email} (${devices} device(s)):`);
console.log(key);
console.log("Send it to them; they enter it in Settings > License.");
