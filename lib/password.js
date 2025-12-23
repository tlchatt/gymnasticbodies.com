import { hash, verify } from "@node-rs/argon2";

const opts = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 lanes
  outputLen: 32, // 32 bytes
  algorithm: 2, // Argon2id
};

export async function hashPassword(password) {
  return await hash(password, opts);
}

export async function verifyPassword({ password, hash }) {
  return await verify(hash, password, opts);
}
