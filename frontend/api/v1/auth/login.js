import { checkLogin, signToken } from "../../_lib/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  const { email, password } = req.body || {};
  const user = email && password ? checkLogin(email, password) : null;
  if (!user) {
    res.status(401).json({ detail: "Invalid credentials" });
    return;
  }
  res.status(200).json({ access_token: signToken(user), token_type: "bearer" });
}
