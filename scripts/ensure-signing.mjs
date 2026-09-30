import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const secureDir = join(homedir(), ".private-core-launcher");
const keystore = join(secureDir, "launcher.keystore");
const properties = join(secureDir, "signing.properties");

await mkdir(secureDir, { recursive: true, mode: 0o700 });
try {
  await readFile(keystore);
  await readFile(properties);
  console.log("Protected signing setup already exists.");
} catch {
  const password = randomBytes(24).toString("base64url");
  await exec("keytool", ["-genkeypair", "-v", "-keystore", keystore, "-alias", "private-core-launcher", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", password, "-keypass", password, "-dname", "CN=Private Core Launcher, OU=Local, O=Private Core, L=Local, S=Local, C=US"]);
  await writeFile(properties, `storeFile=${keystore}\nstorePassword=${password}\nkeyAlias=private-core-launcher\nkeyPassword=${password}\n`, { mode: 0o600 });
  await chmod(keystore, 0o600);
  console.log("Created a protected local signing key. Passwords were generated and stored outside the project.");
}
console.log(`Signing directory: ${secureDir}`);
