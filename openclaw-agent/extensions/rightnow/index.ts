import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createRightnowTools } from "./src/rightnow-tools.js";

export default definePluginEntry({
  id: "rightnow",
  name: "RightNow Connector",
  description: "Fitness tools backed by RightNow Agent API.",
  register(api) {
    const tools = createRightnowTools();
    for (const tool of tools) {
      api.registerTool(tool);
    }
  },
});
