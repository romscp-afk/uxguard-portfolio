import { signToken } from "../../_lib/auth.js";
import { registerUser, toUserOut } from "../../_lib/demo-data.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const { email, password, name, username, title } = req.body || {};
  const result = await registerUser({ email, password, name, username, title });

  if (result.error) {
    res.status(result.status || 400).json({ detail: result.error });
    return;
  }

  const user = toUserOut(result.user);
  res.status(200).json({
    access_token: signToken(result.user),
    token_type: "bearer",
    user,
  });
}
