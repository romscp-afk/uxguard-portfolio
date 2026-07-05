import { getFeedItems } from "../../_lib/demo-data.js";
import { withApi } from "../../_lib/withApi.js";

export default withApi(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }
  res.status(200).json(await getFeedItems());
});
