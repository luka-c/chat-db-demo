import * as bcrypt from "bcrypt";

export async function createPasswordHash(text: string): Promise<string> {
  const salt = await bcrypt.genSalt();

  return await bcrypt.hash(text, salt);
}

export async function validatePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
